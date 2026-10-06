/**
 * <aw-load-more data-section [data-infinite]> — appends the next page of a product grid in place.
 *
 * Markup (snippets/results-grid.liquid): a progress line [data-ref=progress] and a real link [data-ref=button] to the
 * next page, so without JavaScript the shopper simply goes to page 2. With JavaScript a click fetches the next page
 * through the Section Rendering API, appends its grid items to the [data-results-list] of the same results region,
 * and replaces this element with the one from the response (next link, new progress text), or removes it on the last page.
 * With data-infinite the same happens automatically when the button comes within 200px of the viewport; the button
 * stays usable. The address bar is not changed. Emits ThemeEvents.resultsAppended.
 */
import { ThemeElement, define } from '@aw/component';
import { emit, ThemeEvents } from '@aw/events';

class LoadMore extends ThemeElement {
  /** @type {boolean} */
  #loading = false;

  /** @type {IntersectionObserver | null} */
  observer = null;

  mount() {
    const button = /** @type {HTMLAnchorElement | null} */ (this.ref('button'));
    if (!button) return;

    this.listen(button, 'click', (event) => {
      event.preventDefault();
      this.load(true);
    });

    if (this.hasAttribute('data-infinite') && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) this.load(false);
        },
        { rootMargin: '0px 0px 200px 0px' },
      );
      observer.observe(button);
      this.observer = observer;
    }
  }

  unmount() {
    this.observer?.disconnect();
  }

  /** @param {boolean} moveFocus - Focus the first new item (after a click, not after automatic loading) */
  async load(moveFocus) {
    const button = /** @type {HTMLAnchorElement | null} */ (this.ref('button'));
    const list = this.closest('[data-swap]')?.querySelector('[data-results-list]');
    if (this.#loading || !button || !list) return;
    this.#loading = true;

    const url = new URL(button.href);
    url.searchParams.set('section_id', this.dataset.section ?? '');
    const label = button.textContent;
    button.setAttribute('aria-busy', 'true');
    button.textContent = button.dataset.loadingLabel ?? label;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const items = [...(doc.querySelector('[data-results-list]')?.children ?? [])];
      const firstNew = list.children.length;
      for (const item of items) list.append(document.importNode(item, true));

      const next = doc.querySelector('aw-load-more');
      const live = this.closest('aw-facets')?.querySelector('[data-ref="live"]');
      const progress = next?.querySelector('[data-ref="progress"]')?.textContent?.trim();
      if (live && progress) live.textContent = progress;

      if (moveFocus && items.length > 0) {
        /** @type {HTMLElement | null | undefined} */ (list.children[firstNew]?.querySelector('a[href]'))?.focus();
      }

      emit(ThemeEvents.resultsAppended, { sectionId: this.dataset.section, url: url.href, count: items.length });
      if (next) this.replaceWith(document.importNode(next, true));
      else this.remove();
    } catch {
      // Fall back to the plain link: the shopper lands on the next page.
      window.location.href = button.href;
    } finally {
      this.#loading = false;
      if (this.isConnected) {
        button.removeAttribute('aria-busy');
        button.textContent = label;
      }
    }
  }
}

define('aw-load-more', LoadMore);
