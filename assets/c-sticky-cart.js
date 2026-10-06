/**
 * <aw-sticky-cart data-section> — add-to-cart bar fixed to the bottom of the screen on product pages.
 * Appears (data-visible, not inert) once the product form's buy button has scrolled above the viewport and hides
 * again when it comes back. Its button submits the product form itself, so quantity and the selected variant are
 * the page's. The bar content re-renders with the section on every variant change (data-swap), and it re-checks
 * the product form after `aw:variant:changed`.
 */
import { ThemeElement, define } from '@aw/component';
import { ThemeEvents } from '@aw/events';

class StickyCart extends ThemeElement {
  #submitted = false;

  mount() {
    this.listen(this, 'click', (event) => {
      if (!/** @type {HTMLElement} */ (event.target).closest('[data-ref="submit"]')) return;
      const form = this.form();
      if (!form) return;
      this.#submitted = true;
      this.showError('');
      form.requestSubmit();
    });

    this.listen(document, ThemeEvents.cartError, (event) => {
      if (!this.#submitted) return;
      this.#submitted = false;
      this.showError(/** @type {CustomEvent} */ (event).detail.message || '');
    });
    this.listen(document, ThemeEvents.cartUpdated, () => {
      this.#submitted = false;
    });
    this.listen(document, ThemeEvents.variantChanged, (event) => {
      if (/** @type {CustomEvent} */ (event).detail.sectionId === this.dataset.section) this.observe();
    });

    this.observe();
  }

  unmount() {
    this.observer?.disconnect();
  }

  /** The product form of this section (the buy buttons block). */
  form() {
    return /** @type {HTMLFormElement | null} */ (this.closest('aw-product')?.querySelector('aw-product-form form') ?? null);
  }

  observe() {
    this.observer?.disconnect();
    const target = this.form()?.querySelector('[type="submit"]') ?? this.form();
    if (!target) {
      this.toggle(false);
      return;
    }
    this.observer = new IntersectionObserver(([entry]) => {
      this.toggle(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    this.observer.observe(target);
  }

  /** @param {boolean} visible */
  toggle(visible) {
    this.toggleAttribute('data-visible', visible);
    this.inert = !visible;
    if (!visible) this.showError('');
  }

  /** @param {string} message */
  showError(message) {
    const box = this.ref('error');
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }
}

define('aw-sticky-cart', StickyCart);
