/**
 * <aw-predictive-search data-url data-section data-limit data-predictive data-unsupported data-error> — search box
 * with live results (combobox + listbox pattern).
 *
 * Typing waits 300 ms, then renders the `predictive-search` section through Shopify's predictive search endpoint
 * (Section Rendering API). Results are cached per query (last 30) and a newer request aborts the previous one.
 * ArrowDown/ArrowUp move the active result (aria-activedescendant, focus stays in the input), Enter opens it,
 * Enter without an active result submits to the search page. The result count is announced in a polite status.
 * If the store language does not support predictive search, a hint is shown and Enter still searches.
 * Children: data-ref input, results, suggestions, status, clear.
 */
import { ThemeElement, define } from '@aw/component';

const CACHE_LIMIT = 30;

class PredictiveSearch extends ThemeElement {
  mount() {
    this.input = /** @type {HTMLInputElement | null} */ (this.ref('input'));
    this.results = this.ref('results');
    if (!this.input || !this.results) return;
    /** @type {Map<string, string>} */
    this.cache = new Map();
    this.enabled = this.dataset.predictive === 'true';
    /** @type {number | undefined} */
    let timer;

    this.listen(this.input, 'input', () => {
      const term = this.input?.value.trim() ?? '';
      const clear = this.ref('clear');
      if (clear) clear.hidden = term === '';
      if (!this.enabled) return;
      window.clearTimeout(timer);
      if (!term) {
        this.reset();
        return;
      }
      timer = window.setTimeout(() => this.search(term), 300);
    });

    this.listen(this.input, 'keydown', (event) => this.onKeydown(/** @type {KeyboardEvent} */ (event)));

    const clear = this.ref('clear');
    if (clear) {
      this.listen(clear, 'click', () => {
        if (!this.input) return;
        this.input.value = '';
        clear.hidden = true;
        this.reset();
        this.input.focus();
      });
    }

    // Moving the mouse over a result makes it the active one, so arrows continue from there.
    this.listen(this.results, 'pointermove', (event) => {
      const option = /** @type {HTMLElement} */ (event.target).closest?.('[role="option"]');
      if (option && option.getAttribute('aria-selected') !== 'true') this.activate(/** @type {HTMLElement} */ (option), false);
    });

    // Opening the drawer again selects the previous query so typing replaces it.
    const dialog = this.closest('dialog');
    if (dialog) {
      this.listen(dialog, 'toggle', () => {
        if (dialog.open && this.input?.value) this.input.select();
      });
    }
  }

  /** @returns {HTMLElement[]} */
  get options() {
    return /** @type {HTMLElement[]} */ ([...(this.results?.querySelectorAll('[role="option"]') ?? [])]);
  }

  /** @param {KeyboardEvent} event */
  onKeydown(event) {
    if (!this.enabled || this.results?.hidden) return;
    const options = this.options;
    const current = options.findIndex((o) => o.getAttribute('aria-selected') === 'true');
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (options.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = current === -1 ? (step === 1 ? 0 : options.length - 1) : (current + step + options.length) % options.length;
      this.activate(options[next], true);
    } else if (event.key === 'Enter' && current !== -1) {
      event.preventDefault();
      options[current].click();
    }
  }

  /**
   * @param {HTMLElement} option
   * @param {boolean} scroll
   */
  activate(option, scroll) {
    for (const o of this.options) o.setAttribute('aria-selected', String(o === option));
    this.input?.setAttribute('aria-activedescendant', option.id);
    if (scroll) option.scrollIntoView({ block: 'nearest' });
  }

  /** @param {string} term */
  async search(term) {
    if (this.unsupported) return this.showMessage(this.dataset.unsupported ?? '');
    const cached = this.cache?.get(term);
    if (cached !== undefined) return this.render(cached);

    this.controller?.abort();
    this.controller = new AbortController();
    const params = new URLSearchParams({
      q: term,
      section_id: this.dataset.section ?? 'predictive-search',
      'resources[limit]': this.dataset.limit ?? '4',
      'resources[limit_scope]': 'each',
      'resources[type]': 'product,collection,page,article,query',
    });
    this.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(`${this.dataset.url}?${params}`, { signal: this.controller.signal });
      if (response.status === 417) {
        // The store language does not support predictive search: stop asking, explain the Enter key instead.
        this.unsupported = true;
        this.showMessage(this.dataset.unsupported ?? '');
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const html = doc.getElementById('PredictiveSearchResults')?.outerHTML ?? '';
      this.remember(term, html);
      // Ignore late answers for a query the shopper has already changed.
      if (this.input?.value.trim() === term) this.render(html);
    } catch (error) {
      if (/** @type {Error} */ (error).name !== 'AbortError') this.showMessage(this.dataset.error ?? '');
    } finally {
      this.removeAttribute('aria-busy');
    }
  }

  /**
   * @param {string} term
   * @param {string} html
   */
  remember(term, html) {
    if (!this.cache) return;
    this.cache.set(term, html);
    if (this.cache.size > CACHE_LIMIT) this.cache.delete(/** @type {string} */ (this.cache.keys().next().value));
  }

  /** @param {string} html */
  render(html) {
    if (!this.results) return;
    this.results.innerHTML = html;
    this.results.hidden = false;
    this.input?.setAttribute('aria-expanded', 'true');
    this.input?.removeAttribute('aria-activedescendant');
    const suggestions = this.ref('suggestions');
    if (suggestions) suggestions.hidden = true;
    const summary = /** @type {HTMLElement | null} */ (this.results.querySelector('[data-status]'));
    this.announce(summary?.dataset.status ?? '');
  }

  /** @param {string} message */
  showMessage(message) {
    if (!this.results) return;
    const p = document.createElement('p');
    p.className = 'py-4 type-sm text-muted';
    p.textContent = message;
    this.results.replaceChildren(p);
    this.results.hidden = false;
    const suggestions = this.ref('suggestions');
    if (suggestions) suggestions.hidden = true;
    this.announce(message);
  }

  reset() {
    this.controller?.abort();
    if (this.results) {
      this.results.hidden = true;
      this.results.replaceChildren();
    }
    this.input?.setAttribute('aria-expanded', 'false');
    this.input?.removeAttribute('aria-activedescendant');
    const suggestions = this.ref('suggestions');
    if (suggestions) suggestions.hidden = false;
    this.announce('');
  }

  /** @param {string} message */
  announce(message) {
    const status = this.ref('status');
    if (status) status.textContent = message;
  }
}

define('aw-predictive-search', PredictiveSearch);
