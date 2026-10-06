/**
 * <aw-facets data-section> — collection / search filters and sorting without page reloads.
 * Any change inside a [data-facets-form] form or the [data-sort] select re-renders the section for the new
 * query string and swaps the [data-swap] regions (results, filter lists). Links marked [data-facet-link]
 * (remove filter, clear all, pagination) are followed the same way. Without JavaScript the forms submit.
 * Filter groups (<details data-facet-key>) keep their open / closed state across re-renders. In the horizontal
 * layout the groups are dropdowns ([data-facet-dropdown]): one open at a time, closed by an outside click or Escape.
 */
import { ThemeElement, define, swapFromHTML } from '@aw/component';
import { emit, ThemeEvents } from '@aw/events';

class Facets extends ThemeElement {
  /** @type {AbortController | null} */
  #pending = null;

  mount() {
    /** @type {number | undefined} */
    let timer;
    this.listen(this, 'input', (event) => {
      const target = /** @type {HTMLInputElement} */ (event.target);
      if (target.type !== 'number' && target.type !== 'text' && target.type !== 'search') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => this.submitFrom(target), 600);
    });
    this.listen(this, 'change', (event) => {
      const target = /** @type {HTMLInputElement} */ (event.target);
      if (target.type === 'number' || target.type === 'text' || target.type === 'search') return;
      this.submitFrom(target);
    });
    this.listen(this, 'submit', (event) => {
      event.preventDefault();
      this.submitFrom(/** @type {HTMLElement} */ (event.target));
    });
    this.listen(this, 'click', (event) => {
      const link = /** @type {HTMLAnchorElement | null} */ (/** @type {HTMLElement} */ (event.target).closest('a[data-facet-link]'));
      if (!link) return;
      event.preventDefault();
      this.load(new URL(link.href), link.hasAttribute('data-scroll-top'));
    });
    this.listen(window, 'popstate', () => this.load(new URL(window.location.href), false, false));

    // Horizontal layout: filter groups are dropdowns (<details data-facet-dropdown>). One open at a time;
    // a click outside or Escape closes them.
    this.listen(
      this,
      'toggle',
      (event) => {
        const details = /** @type {HTMLElement} */ (event.target);
        if (!(details instanceof HTMLDetailsElement) || !details.open || !details.hasAttribute('data-facet-dropdown')) return;
        for (const other of this.dropdowns()) if (other !== details) other.open = false;
      },
      { capture: true },
    );
    this.listen(document, 'click', (event) => {
      const target = /** @type {Node} */ (event.target);
      for (const details of this.dropdowns()) if (details.open && !details.contains(target)) details.open = false;
    });
    this.listen(this, 'keydown', (event) => {
      if (/** @type {KeyboardEvent} */ (event).key !== 'Escape') return;
      const details = /** @type {HTMLElement} */ (event.target).closest?.('details[data-facet-dropdown][open]');
      if (!(details instanceof HTMLDetailsElement)) return;
      details.open = false;
      /** @type {HTMLElement | null} */ (details.querySelector('summary'))?.focus();
    });
  }

  /** @returns {HTMLDetailsElement[]} */
  dropdowns() {
    return [...this.querySelectorAll('details[data-facet-dropdown]')].map((el) => /** @type {HTMLDetailsElement} */ (el));
  }

  /**
   * Which filter groups are open, per form, so a re-render keeps the shopper's expanded / collapsed choices
   * (and keeps an open dropdown open while several values are ticked).
   * @returns {Map<string, boolean>}
   */
  groupState() {
    const state = new Map();
    for (const details of this.querySelectorAll('details[data-facet-key]')) {
      const form = details.closest('form')?.id ?? '';
      state.set(`${form}|${details.getAttribute('data-facet-key')}`, /** @type {HTMLDetailsElement} */ (details).open);
    }
    return state;
  }

  /** @param {Map<string, boolean>} state */
  restoreGroups(state) {
    for (const details of this.querySelectorAll('details[data-facet-key]')) {
      const form = details.closest('form')?.id ?? '';
      const open = state.get(`${form}|${details.getAttribute('data-facet-key')}`);
      if (open !== undefined) /** @type {HTMLDetailsElement} */ (details).open = open;
    }
  }

  /** @param {HTMLElement} origin */
  submitFrom(origin) {
    const form = /** @type {HTMLFormElement | null} */ (origin.closest('form[data-facets-form]') ?? this.querySelector('form[data-facets-form]'));
    const params = new URLSearchParams();
    if (form) {
      for (const [key, value] of new FormData(form)) {
        if (typeof value === 'string' && value !== '') params.append(key, value);
      }
    }
    const sort = /** @type {HTMLSelectElement | null} */ (this.querySelector('select[data-sort]'));
    if (sort) params.set('sort_by', sort.value);
    const url = new URL(window.location.pathname, window.location.origin);
    url.search = params.toString();
    this.load(url, false);
  }

  /**
   * @param {URL} url
   * @param {boolean} scrollTop
   * @param {boolean} [push]
   */
  async load(url, scrollTop, push = true) {
    this.#pending?.abort();
    this.#pending = new AbortController();
    const request = new URL(url);
    request.searchParams.set('section_id', this.dataset.section ?? '');
    this.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(request, { signal: this.#pending.signal });
      const groups = this.groupState();
      swapFromHTML(this, await response.text());
      this.restoreGroups(groups);
      if (push) window.history.pushState({}, '', url);
      if (scrollTop) this.scrollIntoView({ block: 'start' });
      const live = this.ref('live');
      const count = this.querySelector('[data-results-count]');
      if (live && count) live.textContent = count.textContent ?? '';
      emit(ThemeEvents.facetsUpdated, { sectionId: this.dataset.section, url: url.href });
    } catch (error) {
      if (/** @type {Error} */ (error).name !== 'AbortError') window.location.href = url.href;
    } finally {
      this.removeAttribute('aria-busy');
    }
  }
}

define('aw-facets', Facets);
