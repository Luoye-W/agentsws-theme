/**
 * <aw-cart-items data-section data-change-url data-update-url data-item-count> — cart lines in the cart drawer or on
 * the cart page. Quantity changes and removals are sent to /cart/change; every cart section on the page is
 * re-rendered from the same response. The order note ([data-note]) is saved to /cart/update while typing, and the
 * "agree to terms" checkbox ([data-terms]) keeps its state across re-renders.
 *
 * Optional parts (cart page):
 * - Discount codes: [data-discounts data-codes="A,B"] holds the applied codes; [data-discount-input] + [data-discount-apply]
 *   add one (Enter works too), [data-discount-remove="CODE"] removes one. All codes are sent together to /cart/update.
 * - Gift wrap: checkbox [data-gift-wrap data-variant data-line data-add-url] adds one unit of the wrap product or removes its line.
 * - Cart attributes: text fields [data-cart-attribute="Name"] are saved while typing (e.g. a gift message).
 */
import { ThemeElement, define } from '@aw/component';
import { ThemeEvents } from '@aw/events';
import { changeLine, addItems, updateCart } from '@aw/cart';

class CartItems extends ThemeElement {
  mount() {
    /** @type {number | undefined} */
    let timer;
    this.listen(this, 'change', (event) => {
      const input = /** @type {HTMLInputElement} */ (event.target);
      if (!input.matches('[data-line]')) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => this.change(Number(input.dataset.line), Number(input.value)), 300);
    });

    /** @type {number | undefined} */
    let noteTimer;
    /** @type {number | undefined} */
    let attributeTimer;
    this.listen(this, 'input', (event) => {
      const field = /** @type {HTMLTextAreaElement} */ (event.target);
      if (field.matches('[data-note]')) {
        window.clearTimeout(noteTimer);
        noteTimer = window.setTimeout(() => this.saveNote(field.value), 400);
      } else if (field.matches('[data-cart-attribute]')) {
        window.clearTimeout(attributeTimer);
        const name = field.getAttribute('data-cart-attribute') ?? '';
        attributeTimer = window.setTimeout(() => this.saveAttribute(name, field.value), 400);
      }
    });

    this.listen(this, 'change', (event) => {
      const box = /** @type {HTMLInputElement} */ (event.target);
      if (box.matches('[data-gift-wrap]')) this.toggleGiftWrap(box);
    });

    this.listen(this, 'click', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      const remove = target.closest('[data-remove-line]');
      if (remove) {
        event.preventDefault();
        this.change(Number(remove.getAttribute('data-remove-line')), 0);
        return;
      }
      if (target.closest('[data-discount-apply]')) {
        event.preventDefault();
        this.applyDiscount();
        return;
      }
      const removeCode = target.closest('[data-discount-remove]');
      if (removeCode) {
        event.preventDefault();
        this.setDiscounts(this.discountCodes().filter((code) => code !== removeCode.getAttribute('data-discount-remove')));
      }
    });

    this.listen(this, 'keydown', (event) => {
      const key = /** @type {KeyboardEvent} */ (event);
      if (key.key !== 'Enter' || !(/** @type {HTMLElement} */ (key.target).matches('[data-discount-input]'))) return;
      key.preventDefault();
      this.applyDiscount();
    });

    this.listen(document, ThemeEvents.cartUpdated, (event) => {
      const html = /** @type {CustomEvent} */ (event).detail.sections?.[this.dataset.section ?? ''];
      if (html) this.render(html);
    });

    this.listen(document, ThemeEvents.cartError, (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      if (detail.source !== 'change' && detail.source !== 'update') return;
      const box = this.ref('error');
      if (box) {
        box.textContent = detail.message || this.dataset.errorText || '';
        box.hidden = false;
      }
    });
  }

  /**
   * @param {number} line
   * @param {number} quantity
   */
  async change(line, quantity) {
    this.setAttribute('aria-busy', 'true');
    const ok = await changeLine(this.dataset.changeUrl ?? '/cart/change', line, quantity);
    this.removeAttribute('aria-busy');
    if (!ok) return;
  }

  /** @param {string} note */
  async saveNote(note) {
    try {
      await fetch(`${this.dataset.updateUrl ?? '/cart/update'}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ note }),
      });
    } catch {
      // The note is also submitted with the checkout form, so a failed background save loses nothing.
    }
  }

  /** Codes already applied to the cart (from the rendered discount panel). */
  discountCodes() {
    const holder = this.querySelector('[data-discounts]');
    return (holder?.getAttribute('data-codes') ?? '').split(',').map((code) => code.trim()).filter(Boolean);
  }

  applyDiscount() {
    const input = /** @type {HTMLInputElement | null} */ (this.querySelector('[data-discount-input]'));
    const code = input?.value.trim() ?? '';
    const codes = this.discountCodes();
    if (!code || codes.some((existing) => existing.toLowerCase() === code.toLowerCase())) return;
    this.setDiscounts([...codes, code], code);
  }

  /**
   * @param {string[]} codes - every code that should be on the cart
   * @param {string} [added] - the code just entered; a message appears when the cart cannot use it
   */
  async setDiscounts(codes, added) {
    this.setAttribute('aria-busy', 'true');
    const cart = await updateCart(this.dataset.updateUrl ?? '/cart/update', { discount: codes.join(',') });
    this.removeAttribute('aria-busy');
    if (!cart || !added) return;
    /** @type {{ code: string, applicable: boolean }[]} */
    const applied = cart.discount_codes ?? [];
    const match = applied.find((d) => d.code.toLowerCase() === added.toLowerCase());
    if (match && match.applicable) return;
    const message = /** @type {HTMLElement | null} */ (this.querySelector('[data-discount-message]'));
    if (message) {
      message.textContent = message.dataset.invalid ?? '';
      message.hidden = false;
    }
    /** @type {HTMLElement | null} */ (this.querySelector('[data-discount-input]'))?.focus();
  }

  /** @param {HTMLInputElement} box */
  async toggleGiftWrap(box) {
    this.setAttribute('aria-busy', 'true');
    if (box.checked) {
      await addItems(box.dataset.addUrl ?? '/cart/add', [{ id: box.dataset.variant ?? '', quantity: 1 }]);
    } else if (Number(box.dataset.line) > 0) {
      await changeLine(this.dataset.changeUrl ?? '/cart/change', Number(box.dataset.line), 0);
    }
    this.removeAttribute('aria-busy');
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  async saveAttribute(name, value) {
    if (!name) return;
    try {
      await fetch(`${this.dataset.updateUrl ?? '/cart/update'}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ attributes: { [name]: value } }),
      });
    } catch {
      // The field is also submitted with the checkout form (attributes[…]), so a failed background save loses nothing.
    }
  }

  /** @param {string} html */
  render(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.querySelector(`aw-cart-items[data-section="${CSS.escape(this.dataset.section ?? '')}"]`);
    if (!next) return;
    const focused = /** @type {HTMLElement | null} */ (document.activeElement);
    const focusLine = this.contains(focused) ? focused?.getAttribute('data-line') : null;
    const focusId = this.contains(focused) ? focused?.id : '';
    const agreed = /** @type {HTMLInputElement | null} */ (this.querySelector('[data-terms]'))?.checked ?? false;
    const openPanels = [...this.querySelectorAll('details[data-keep-open][open]')].map((d) => d.getAttribute('data-keep-open'));
    this.innerHTML = next.innerHTML;
    for (const key of openPanels) this.querySelector(`details[data-keep-open="${CSS.escape(key ?? '')}"]`)?.setAttribute('open', '');
    this.dataset.itemCount = next.getAttribute('data-item-count') ?? '0';
    const terms = /** @type {HTMLInputElement | null} */ (this.querySelector('[data-terms]'));
    if (terms) terms.checked = agreed;
    if (focusLine) /** @type {HTMLElement | null} */ (this.querySelector(`[data-line="${focusLine}"]`))?.focus();
    else if (focusId && document.getElementById(focusId)) document.getElementById(focusId)?.focus();
    else if (focused && !document.contains(focused)) /** @type {HTMLElement | null} */ (this.querySelector('[data-ref="heading"]'))?.focus();
  }
}

define('aw-cart-items', CartItems);
