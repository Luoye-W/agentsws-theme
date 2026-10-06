/**
 * <aw-bundle-builder data-section data-min data-max [data-allow-duplicates] data-cart-add-url data-cart-url data-cart-type
 *   data-money-format data-total-format data-*-text> — "Build your bundle" (sections/bundle-builder.liquid).
 *
 * - Cards (data-ref="card") hold a variant <select data-ref="variant"> (or a hidden input for single-variant products)
 *   whose options carry data-price (cents), data-price-text, data-image, data-image-large, data-variant-title and
 *   data-available. Changing the variant updates the card's price and image.
 * - "Add to bundle" (data-ref="add") appends the chosen variant; buttons use aria-disabled (so keyboard focus stays put)
 *   when the variant is sold out, the bundle is full (data-max) or the product is already in it (unless
 *   data-allow-duplicates).
 * - The panel lists picked items (cloned from <template data-ref="item-template">) followed by empty slots up to data-min,
 *   updates the progress bar, total and the "Add bundle to cart" button (enabled once data-min is reached) and announces
 *   every change in a polite live region. On phones the list opens with the toggle button (data-open on the panel).
 * - The selection is kept in sessionStorage per section, so it survives reloads in the same tab; unknown or sold-out
 *   variants are dropped when restoring.
 * - Submitting adds all items in one /cart/add request (`addItems` from @aw/cart), then clears the bundle and opens the
 *   cart drawer (or goes to the cart page). On failure the selection is kept and the error is shown.
 */
import { ThemeElement, define } from '@aw/component';
import { ThemeEvents } from '@aw/events';
import { addItems, formatMoney } from '@aw/cart';

/**
 * @typedef {{ variantId: string, productId: string, title: string, variantTitle: string, price: number, image: string, url: string, available: boolean }} BundleVariant
 */

class BundleBuilder extends ThemeElement {
  #busy = false;
  /** @type {BundleVariant[]} */
  items = [];
  /** @type {Map<string, BundleVariant>} */
  catalog = new Map();

  mount() {
    this.min = Math.max(1, Number(this.dataset.min) || 1);
    this.max = Math.max(this.min, Number(this.dataset.max) || this.min);
    this.storageKey = `aw:bundle:${this.dataset.section ?? ''}`;
    this.buildCatalog();
    this.items = this.restore();

    for (const card of this.refs('card')) {
      const add = /** @type {HTMLElement | null} */ (card.querySelector('[data-ref="add"]'));
      if (add) this.listen(add, 'click', () => this.add(card, add));
      const select = card.querySelector('select[data-ref="variant"]');
      if (select) this.listen(select, 'change', () => this.syncCard(card));
    }

    const list = this.ref('list');
    if (list) {
      this.listen(list, 'click', (event) => {
        const button = /** @type {HTMLElement} */ (event.target).closest('[data-slot="remove"]');
        if (button instanceof HTMLElement) this.remove(Number(button.dataset.index));
      });
    }

    const toggle = this.ref('toggle');
    if (toggle) {
      this.listen(toggle, 'click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        this.ref('panel')?.toggleAttribute('data-open', open);
      });
    }

    const submit = this.ref('submit');
    if (submit) this.listen(submit, 'click', () => this.submit(submit));

    this.listen(document, ThemeEvents.cartError, (event) => {
      if (!this.#busy) return;
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.showError(detail.message || this.dataset.errorText || '');
    });

    this.render();
  }

  /** Read every variant the cards offer (price, image, availability) from their markup. */
  buildCatalog() {
    this.catalog.clear();
    for (const card of this.refs('card')) {
      const input = card.querySelector('[data-ref="variant"]');
      const sources = input instanceof HTMLSelectElement ? [...input.options] : input ? [input] : [];
      for (const source of sources) {
        const el = /** @type {HTMLElement & { value: string }} */ (source);
        this.catalog.set(el.value, {
          variantId: el.value,
          productId: card.dataset.productId ?? '',
          title: card.dataset.title ?? '',
          variantTitle: el.dataset.variantTitle ?? '',
          price: Number(el.dataset.price) || 0,
          image: el.dataset.image ?? '',
          url: card.dataset.url ?? '',
          available: el.hasAttribute('data-available'),
        });
      }
    }
  }

  /** @returns {BundleVariant[]} */
  restore() {
    /** @type {string[]} */
    let ids = [];
    try {
      const value = JSON.parse(window.sessionStorage.getItem(this.storageKey) ?? '[]');
      if (Array.isArray(value)) ids = value.map(String);
    } catch {
      ids = [];
    }
    /** @type {BundleVariant[]} */
    const items = [];
    for (const id of ids) {
      const variant = this.catalog.get(id);
      if (!variant || !variant.available || items.length >= this.max) continue;
      if (!this.allowDuplicates && items.some((item) => item.productId === variant.productId)) continue;
      items.push(variant);
    }
    return items;
  }

  save() {
    try {
      window.sessionStorage.setItem(this.storageKey, JSON.stringify(this.items.map((item) => item.variantId)));
    } catch {
      // Storage blocked: the bundle simply does not survive a reload.
    }
  }

  get allowDuplicates() {
    return this.hasAttribute('data-allow-duplicates');
  }

  /**
   * The variant currently chosen on a card.
   * @param {HTMLElement} card
   */
  cardVariant(card) {
    const input = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (card.querySelector('[data-ref="variant"]'));
    return input ? this.catalog.get(input.value) : undefined;
  }

  /**
   * Follow a card's variant menu: price and image.
   * @param {HTMLElement} card
   */
  syncCard(card) {
    const select = card.querySelector('select[data-ref="variant"]');
    const option = select instanceof HTMLSelectElement ? select.selectedOptions[0] : null;
    if (!option) return;
    const price = card.querySelector('[data-ref="price"]');
    if (price && option.dataset.priceText) price.textContent = option.dataset.priceText;
    const img = card.querySelector('[data-ref="media"] img');
    if (img instanceof HTMLImageElement && option.dataset.imageLarge) {
      img.removeAttribute('srcset');
      img.src = option.dataset.imageLarge;
    }
    this.updateCards();
  }

  /**
   * @param {HTMLElement} card
   * @param {HTMLElement} button
   */
  add(card, button) {
    if (button.getAttribute('aria-disabled') === 'true') return;
    const variant = this.cardVariant(card);
    if (!variant) return;
    this.items.push(variant);
    this.save();
    this.render();
    this.showError('');
    this.announce(this.fill(this.dataset.addedText, variant.title));
  }

  /** @param {number} index */
  remove(index) {
    const [removed] = this.items.splice(index, 1);
    if (!removed) return;
    this.save();
    this.render();
    this.announce(this.fill(this.dataset.removedText, removed.title));

    const buttons = /** @type {HTMLElement[]} */ ([...this.querySelectorAll('[data-slot="remove"]')]);
    const next = buttons[Math.min(index, buttons.length - 1)];
    // On phones the list may be collapsed: fall back to the panel heading when the button is not rendered.
    if (next && next.getClientRects().length) next.focus();
    else /** @type {HTMLElement | null} */ (this.ref('panel')?.querySelector('h2'))?.focus();
  }

  render() {
    this.renderList();
    this.updateCards();
    this.updateSummary();
  }

  renderList() {
    const list = this.ref('list');
    const itemTemplate = /** @type {HTMLTemplateElement | null} */ (this.ref('item-template'));
    const emptyTemplate = /** @type {HTMLTemplateElement | null} */ (this.ref('empty-template'));
    if (!list || !itemTemplate || !emptyTemplate) return;

    const nodes = this.items.map((item, index) => {
      const fragment = /** @type {DocumentFragment} */ (itemTemplate.content.cloneNode(true));
      const image = fragment.querySelector('[data-slot="image"]');
      if (image instanceof HTMLImageElement && item.image) {
        image.src = item.image;
        image.hidden = false;
      }
      const title = fragment.querySelector('[data-slot="title"]');
      if (title instanceof HTMLAnchorElement) {
        title.textContent = item.title;
        title.href = item.url;
      }
      const variant = fragment.querySelector('[data-slot="variant"]');
      if (variant) {
        variant.textContent = item.variantTitle;
        variant.toggleAttribute('hidden', !item.variantTitle);
      }
      const price = fragment.querySelector('[data-slot="price"]');
      if (price) price.textContent = this.money(item.price);
      const remove = /** @type {HTMLElement | null} */ (fragment.querySelector('[data-slot="remove"]'));
      if (remove) {
        remove.dataset.index = String(index);
        remove.setAttribute('aria-label', this.fill(this.dataset.removeText, item.title));
      }
      return fragment;
    });
    for (let i = this.items.length; i < this.min; i += 1) {
      nodes.push(/** @type {DocumentFragment} */ (emptyTemplate.content.cloneNode(true)));
    }
    list.replaceChildren(...nodes);
  }

  updateCards() {
    const full = this.items.length >= this.max;
    for (const card of this.refs('card')) {
      const button = /** @type {HTMLElement | null} */ (card.querySelector('[data-ref="add"]'));
      const variant = this.cardVariant(card);
      if (!button) continue;
      const inBundle = !this.allowDuplicates && this.items.some((item) => item.productId === card.dataset.productId);
      let label = this.dataset.addText ?? '';
      let disabled = full;
      if (!variant?.available) {
        label = this.dataset.soldOutText ?? '';
        disabled = true;
      } else if (inBundle) {
        label = this.dataset.inBundleText ?? '';
        disabled = true;
      }
      if (button.textContent?.trim() !== label) button.textContent = label;
      if (disabled) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
    }
  }

  updateSummary() {
    const count = this.items.length;
    const progress = this.ref('progress');
    const bar = this.ref('progress-bar');
    const percent = Math.min(count / this.min, 1) * 100;
    bar?.style.setProperty('--progress', `${percent}%`);
    progress?.setAttribute('aria-valuenow', String(Math.min(count, this.min)));

    const text = this.ref('progress-text');
    if (text) {
      if (count >= this.max) text.textContent = this.fill(this.dataset.fullText, '', count);
      else if (count >= this.min) text.textContent = this.fill(this.dataset.readyText, '', count);
      else text.textContent = this.fill(this.dataset.progressText, '', count);
    }

    const total = this.ref('total');
    if (total) {
      const cents = this.items.reduce((sum, item) => sum + item.price, 0);
      total.textContent = formatMoney(cents, this.dataset.totalFormat || this.dataset.moneyFormat || '{{amount}}');
    }

    const submit = this.ref('submit');
    if (submit) {
      if (count >= this.min) submit.removeAttribute('aria-disabled');
      else submit.setAttribute('aria-disabled', 'true');
    }
  }

  /** @param {HTMLElement} button */
  async submit(button) {
    if (this.#busy) return;
    const count = this.items.length;
    if (count < this.min) {
      this.announce(this.fill(this.dataset.needText, '', this.min - count));
      return;
    }
    /** @type {Map<string, number>} */
    const quantities = new Map();
    for (const item of this.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + 1);
    const items = [...quantities].map(([id, quantity]) => ({ id: Number(id), quantity }));

    this.#busy = true;
    this.showError('');
    button.setAttribute('aria-busy', 'true');
    const added = await addItems(this.dataset.cartAddUrl ?? '/cart/add', items);
    this.#busy = false;
    button.removeAttribute('aria-busy');
    if (!added) return;

    this.items = [];
    this.save();
    this.render();
    const drawer = /** @type {any} */ (document.getElementById('CartDrawer'));
    if (drawer?.open && this.dataset.cartType !== 'page') drawer.open(button);
    else window.location.href = this.dataset.cartUrl ?? '/cart';
  }

  /**
   * Fill a translated template: [title], [count], [min], [max].
   * @param {string | undefined} template
   * @param {string} title
   * @param {number} [count]
   */
  fill(template, title, count = this.items.length) {
    return (template ?? '')
      .replaceAll('[title]', title)
      .replaceAll('[count]', String(count))
      .replaceAll('[min]', String(this.min))
      .replaceAll('[max]', String(this.max));
  }

  /** @param {string} message */
  announce(message) {
    const status = this.ref('status');
    if (!status) return;
    status.textContent = '';
    requestAnimationFrame(() => {
      status.textContent = message;
    });
  }

  /** @param {string} message */
  showError(message) {
    const box = this.ref('error');
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }

  /** @param {number} cents */
  money(cents) {
    return formatMoney(cents, this.dataset.moneyFormat || '{{amount}}');
  }
}

define('aw-bundle-builder', BundleBuilder);
