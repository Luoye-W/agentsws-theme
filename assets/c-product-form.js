/**
 * <aw-product-form data-cart-add-url data-cart-url data-cart-type> — adds to cart without leaving the page and opens the
 * cart drawer. With cart type "page" (Theme settings → Cart) or without JavaScript the form submits normally.
 * Errors show only in the form that sent the request (several forms can share a page: comparison table, quick view).
 * Inside the quick view window (dialog[data-quick-view]) the window closes before the cart drawer opens.
 */
import { ThemeElement, define } from '@aw/component';
import { ThemeEvents } from '@aw/events';
import { addToCart } from '@aw/cart';

class ProductForm extends ThemeElement {
  #busy = false;

  mount() {
    const form = this.querySelector('form');
    if (!form || this.dataset.cartType === 'page') return;

    this.listen(form, 'submit', async (event) => {
      event.preventDefault();
      const button = /** @type {HTMLButtonElement | null} */ (form.querySelector('[type="submit"]'));
      if (button?.getAttribute('aria-disabled') === 'true') return;
      this.showError('');
      this.#busy = true;
      button?.setAttribute('aria-disabled', 'true');
      button?.setAttribute('aria-busy', 'true');

      const added = await addToCart(this.dataset.cartAddUrl ?? '/cart/add', new FormData(form));

      this.#busy = false;
      button?.removeAttribute('aria-disabled');
      button?.removeAttribute('aria-busy');
      if (added) {
        const quickView = /** @type {any} */ (this.closest('dialog[data-quick-view]'));
        const opener = quickView?.returnFocusTo ?? button;
        quickView?.close();
        const drawer = /** @type {any} */ (document.getElementById('CartDrawer'));
        if (drawer?.open) drawer.open(opener);
        else window.location.href = this.dataset.cartUrl ?? '/cart';
      }
    });

    this.listen(document, ThemeEvents.cartError, (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      if (this.#busy && detail.source === 'add') this.showError(detail.message || this.dataset.errorText || '');
    });
  }

  /** @param {string} message */
  showError(message) {
    const box = this.ref('error');
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }
}

define('aw-product-form', ProductForm);
