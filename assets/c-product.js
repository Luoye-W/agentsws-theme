/**
 * <aw-product data-section data-url> — switches variants on a product section without reloading.
 *
 * When an option input (data-option-value-id) changes, it asks Shopify to re-render the section for the
 * chosen option values (Section Rendering API, `option_values` parameter) and swaps every [data-swap]
 * region: price, picker, buy buttons, inventory text… Blocks opt in simply by carrying data-swap.
 * The URL gets ?variant= so the page can be shared (not with data-update-url="false", used by the quick view window);
 * `aw:variant:changed` tells the gallery, sticky add-to-cart bar and other listeners to follow.
 */
import { ThemeElement, define, swapFromHTML } from '@aw/component';
import { emit, ThemeEvents } from '@aw/events';

class Product extends ThemeElement {
  /** @type {AbortController | null} */
  #pending = null;

  mount() {
    this.listen(this, 'change', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.matches('[data-option-value-id], select[data-option]')) this.update();
    });
  }

  /** Option value ids currently chosen in the picker, in option order. */
  selectedValueIds() {
    const ids = [];
    for (const group of this.querySelectorAll('[data-option]')) {
      if (group instanceof HTMLSelectElement) {
        ids.push(group.selectedOptions[0]?.dataset.optionValueId);
      } else {
        ids.push(/** @type {HTMLInputElement | null} */ (group.querySelector('input:checked'))?.dataset.optionValueId);
      }
    }
    return ids.filter(Boolean);
  }

  async update() {
    this.#pending?.abort();
    this.#pending = new AbortController();
    const url = new URL(this.dataset.url ?? window.location.pathname, window.location.origin);
    url.searchParams.set('section_id', this.dataset.section ?? '');
    url.searchParams.set('option_values', this.selectedValueIds().join(','));

    this.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(url, { signal: this.#pending.signal });
      const html = await response.text();
      const doc = swapFromHTML(this, html);
      const state = doc.querySelector('[data-variant-state]');
      const variantId = state?.getAttribute('data-variant-id') ?? '';
      const mediaId = state?.getAttribute('data-media-id') ?? '';
      if (variantId && this.dataset.updateUrl !== 'false') {
        const page = new URL(window.location.href);
        page.searchParams.set('variant', variantId);
        window.history.replaceState({}, '', page);
      }
      emit(ThemeEvents.variantChanged, { sectionId: this.dataset.section, variantId, mediaId });
    } catch (error) {
      if (/** @type {Error} */ (error).name !== 'AbortError') window.location.reload();
    } finally {
      this.removeAttribute('aria-busy');
    }
  }
}

define('aw-product', Product);
