/**
 * <aw-product-addons data-section data-cart-add-url data-cart-url data-cart-type data-money-format>
 * — "Frequently bought together" list (blocks/product-addons.liquid).
 *
 * Rows (data-ref="row") carry data-variant-id / data-price (cents) / data-quantity; a variant <select> updates them
 * from its selected option. The row marked data-current follows the product page's variant (`aw:variant:changed`)
 * using the variant list in its JSON script. The total and the button's count update live; the button adds every
 * ticked row in one /cart/add request and opens the cart drawer.
 */
import { ThemeElement, define } from '@aw/component';
import { ThemeEvents } from '@aw/events';
import { addItems, formatMoney } from '@aw/cart';

class ProductAddons extends ThemeElement {
  #busy = false;

  mount() {
    this.listen(this, 'change', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target instanceof HTMLSelectElement && target.dataset.ref === 'variant') this.syncSelect(target);
      this.update();
    });

    const add = this.ref('add');
    if (add) this.listen(add, 'click', () => this.add(add));

    this.listen(document, ThemeEvents.variantChanged, (event) => {
      const { sectionId, variantId } = /** @type {CustomEvent} */ (event).detail;
      if (sectionId === this.dataset.section && variantId) this.followVariant(String(variantId));
    });

    this.listen(document, ThemeEvents.cartError, (event) => {
      if (!this.#busy) return;
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.showError(detail.message || this.dataset.errorText || '');
    });

    this.update();
  }

  /** @returns {HTMLElement[]} Rows whose checkbox is ticked. */
  selected() {
    return /** @type {HTMLElement[]} */ (this.refs('row')).filter((row) => {
      const check = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ref="check"]'));
      return check?.checked && !check.disabled;
    });
  }

  /** @param {HTMLSelectElement} select */
  syncSelect(select) {
    const row = /** @type {HTMLElement | null} */ (select.closest('[data-ref="row"]'));
    const option = select.selectedOptions[0];
    if (!row || !option) return;
    row.dataset.variantId = option.value;
    row.dataset.price = option.dataset.price ?? '0';
    row.dataset.quantity = option.dataset.quantity ?? '1';
    const price = row.querySelector('[data-ref="price"]');
    if (price) price.textContent = this.money(Number(row.dataset.price));
  }

  /** @param {string} variantId */
  followVariant(variantId) {
    const row = /** @type {HTMLElement | null} */ (this.querySelector('[data-ref="row"][data-current]'));
    const data = row?.querySelector('[data-ref="variants"]')?.textContent;
    if (!row || !data) return;
    /** @type {{ id: number, price: number, available: boolean, title: string, min: number }[]} */
    let variants = [];
    try {
      variants = JSON.parse(data);
    } catch {
      return;
    }
    const variant = variants.find((v) => String(v.id) === variantId);
    if (!variant) return;
    row.dataset.variantId = String(variant.id);
    row.dataset.price = String(variant.price);
    row.dataset.quantity = String(variant.min || 1);
    const price = row.querySelector('[data-ref="price"]');
    if (price) price.textContent = this.money(variant.price);
    const title = row.querySelector('[data-ref="variant-title"]');
    if (title) title.textContent = variant.title;
    const check = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-ref="check"]'));
    if (check) {
      check.disabled = !variant.available;
      if (!variant.available) check.checked = false;
    }
    this.update();
  }

  update() {
    const rows = this.selected();
    const total = rows.reduce((sum, row) => sum + Number(row.dataset.price || 0) * Number(row.dataset.quantity || 1), 0);
    const totalBox = this.ref('total');
    if (totalBox) totalBox.textContent = this.money(total);
    const count = this.ref('count');
    if (count) count.textContent = rows.length ? `(${rows.length})` : '';
    const add = this.ref('add');
    if (add) add.toggleAttribute('disabled', rows.length === 0);
  }

  /** @param {HTMLElement} button */
  async add(button) {
    const rows = this.selected();
    if (this.#busy || !rows.length) return;
    this.#busy = true;
    this.showError('');
    button.setAttribute('aria-busy', 'true');
    const items = rows.map((row) => ({ id: Number(row.dataset.variantId), quantity: Number(row.dataset.quantity || 1) }));
    const added = await addItems(this.dataset.cartAddUrl ?? '/cart/add', items);
    this.#busy = false;
    button.removeAttribute('aria-busy');
    if (!added) return;
    const drawer = /** @type {any} */ (document.getElementById('CartDrawer'));
    if (drawer?.open && this.dataset.cartType !== 'page') drawer.open(button);
    else window.location.href = this.dataset.cartUrl ?? '/cart';
  }

  /** @param {string} message */
  showError(message) {
    const box = this.ref('error');
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }

  /**
   * Format cents with the shop's money format (Settings → General → Store currency).
   * @param {number} cents
   */
  money(cents) {
    return formatMoney(cents, this.dataset.moneyFormat || '{{amount}}');
  }
}

export { formatMoney };

define('aw-product-addons', ProductAddons);
