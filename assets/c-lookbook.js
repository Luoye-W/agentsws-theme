/**
 * <aw-lookbook> — hotspots on a shoppable image.
 *
 * Each [data-ref=hotspot] holds a button ([data-ref=hotspot-button]) and a card ([data-ref=card], popover="manual").
 * Without JavaScript the button toggles the card natively (popovertarget). With JavaScript:
 *   - mouse hover or keyboard focus shows a preview; click (or Enter/Space) pins it open;
 *   - Enter/Space also moves focus into the card; Escape closes it and returns focus to the hotspot;
 *   - a click outside, or focus leaving the hotspot, closes it; only one card is open at a time;
 *   - on desktop the card floats next to its hotspot (flipping above/sideways near the edges); on phones CSS turns it
 *     into a bottom sheet;
 *   - list rows ([data-ref=list-item]) and hotspots highlight each other (data-active);
 *   - the Add to cart form in a card adds through @aw/cart and opens the cart drawer (cart type "page" submits normally).
 * Theme editor: selecting a hotspot block opens its card.
 */
import { ThemeElement, define } from '@aw/component';
import { ThemeEvents } from '@aw/events';
import { addToCart } from '@aw/cart';

const desktop = window.matchMedia('(min-width: 750px)');
const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');

class Lookbook extends ThemeElement {
  mount() {
    /** @type {HTMLElement | null} */
    this.openSpot = null;
    this.spots = /** @type {HTMLElement[]} */ (this.refs('hotspot'));
    for (const spot of this.spots) this.setupSpot(spot);

    for (const item of this.refs('list-item')) {
      const spot = this.spotById(item.dataset.blockId);
      if (!spot) continue;
      const on = () => this.highlight(spot, true);
      const off = () => this.highlight(spot, false);
      this.listen(item, 'pointerenter', on);
      this.listen(item, 'pointerleave', off);
      this.listen(item, 'focusin', on);
      this.listen(item, 'focusout', off);
    }

    // Light dismiss and Escape (manual popovers do neither on their own).
    this.listen(document, 'pointerdown', (event) => {
      const spot = this.openSpot;
      if (!spot) return;
      const target = /** @type {Node} */ (event.target);
      // A press on the bottom sheet's backdrop targets the popover element itself.
      if (!spot.contains(target) || target === this.cardOf(spot)) this.close(spot);
    });
    this.listen(document, 'keydown', (event) => {
      if (/** @type {KeyboardEvent} */ (event).key !== 'Escape' || !this.openSpot) return;
      const spot = this.openSpot;
      this.close(spot);
      this.buttonOf(spot)?.focus();
    });
    this.listen(window, 'resize', () => this.openSpot && this.position(this.openSpot));
    this.listen(window, 'scroll', () => this.openSpot && this.position(this.openSpot), { passive: true, capture: true });

    this.listen(this, 'submit', (event) => this.onSubmit(/** @type {SubmitEvent} */ (event)));
    this.listen(document, ThemeEvents.cartError, (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      if (detail.source === 'add' && this.pendingForm) this.showError(this.pendingForm, detail.message || this.dataset.errorText || '');
    });

    this.listen(document, 'shopify:block:select', (event) => {
      const spot = this.spotById(/** @type {CustomEvent} */ (event).detail?.blockId);
      if (spot) this.open(spot, { pin: true });
    });
    this.listen(document, 'shopify:block:deselect', () => this.openSpot && this.close(this.openSpot));
  }

  /** @param {string | undefined} id */
  spotById(id) {
    return this.spots?.find((spot) => spot.dataset.blockId === id) ?? null;
  }

  /** @param {HTMLElement} spot */
  buttonOf(spot) {
    return /** @type {HTMLButtonElement | null} */ (spot.querySelector('[data-ref="hotspot-button"]'));
  }

  /** @param {HTMLElement} spot */
  cardOf(spot) {
    return /** @type {HTMLElement | null} */ (spot.querySelector('[data-ref="card"]'));
  }

  /** @param {HTMLElement} spot */
  setupSpot(spot) {
    const button = this.buttonOf(spot);
    const card = this.cardOf(spot);
    if (!button || !card || !('showPopover' in card)) return;
    button.removeAttribute('popovertarget');

    this.listen(button, 'click', (event) => {
      const pinnedOpen = this.isOpen(spot) && spot.hasAttribute('data-pinned');
      if (pinnedOpen) this.close(spot);
      else this.open(spot, { pin: true, focus: /** @type {MouseEvent} */ (event).detail === 0 });
    });
    this.listen(button, 'focus', () => {
      if (button.matches(':focus-visible') && !this.isOpen(spot)) this.open(spot, { pin: false });
    });
    this.listen(spot, 'focusout', (event) => {
      const next = /** @type {Node | null} */ (/** @type {FocusEvent} */ (event).relatedTarget);
      if (next && !spot.contains(next)) this.close(spot);
    });
    this.listen(spot, 'pointerenter', (event) => {
      if (/** @type {PointerEvent} */ (event).pointerType !== 'mouse' || !hoverPointer.matches || !desktop.matches) return;
      clearTimeout(this.hideTimer);
      if (!this.isOpen(spot)) this.open(spot, { pin: false });
    });
    this.listen(spot, 'pointerleave', (event) => {
      if (/** @type {PointerEvent} */ (event).pointerType !== 'mouse' || spot.hasAttribute('data-pinned')) return;
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => this.close(spot), 200);
    });
    // Keep state in sync when the native close button (popovertargetaction="hide") closes the card.
    this.listen(card, 'toggle', (event) => {
      if (/** @type {ToggleEvent} */ (event).newState === 'closed') this.afterClose(spot);
    });
  }

  /** @param {HTMLElement} spot */
  isOpen(spot) {
    return this.cardOf(spot)?.matches(':popover-open') ?? false;
  }

  /**
   * @param {HTMLElement} spot
   * @param {{ pin?: boolean, focus?: boolean }} options
   */
  open(spot, { pin = false, focus = false }) {
    const card = this.cardOf(spot);
    if (!card) return;
    if (this.openSpot && this.openSpot !== spot) this.close(this.openSpot);
    if (!this.isOpen(spot)) card.showPopover();
    this.openSpot = spot;
    spot.toggleAttribute('data-pinned', pin || spot.hasAttribute('data-pinned'));
    this.buttonOf(spot)?.setAttribute('aria-expanded', 'true');
    this.highlight(spot, true);
    this.position(spot);
    if (focus) /** @type {HTMLElement | null} */ (card.querySelector('a[href], button:not([disabled]), input:not([type="hidden"])'))?.focus();
  }

  /** @param {HTMLElement} spot */
  close(spot) {
    clearTimeout(this.hideTimer);
    const card = this.cardOf(spot);
    if (card && this.isOpen(spot)) card.hidePopover();
    this.afterClose(spot);
  }

  /** @param {HTMLElement} spot */
  afterClose(spot) {
    spot.removeAttribute('data-pinned');
    this.buttonOf(spot)?.setAttribute('aria-expanded', 'false');
    this.highlight(spot, false);
    if (this.openSpot === spot) this.openSpot = null;
  }

  /**
   * @param {HTMLElement} spot
   * @param {boolean} on
   */
  highlight(spot, on) {
    this.buttonOf(spot)?.toggleAttribute('data-active', on);
    const item = this.refs('list-item').find((el) => el.dataset.blockId === spot.dataset.blockId);
    item?.toggleAttribute('data-active', on);
  }

  /** Float the card beside its hotspot on desktop; phones use the CSS bottom sheet. @param {HTMLElement} spot */
  position(spot) {
    const card = this.cardOf(spot);
    const button = this.buttonOf(spot);
    if (!card || !button) return;
    if (!desktop.matches) {
      card.style.removeProperty('top');
      card.style.removeProperty('left');
      return;
    }
    const gap = 12;
    const margin = 8;
    const anchor = button.getBoundingClientRect();
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    let top = anchor.bottom + gap;
    if (top + height > window.innerHeight - margin && anchor.top - gap - height > margin) top = anchor.top - gap - height;
    let left = anchor.left + anchor.width / 2 - width / 2;
    left = Math.min(Math.max(left, margin), window.innerWidth - width - margin);
    card.style.top = `${Math.max(top, margin)}px`;
    card.style.left = `${left}px`;
  }

  /** @param {SubmitEvent} event */
  async onSubmit(event) {
    const form = /** @type {HTMLFormElement} */ (event.target);
    if (!form.closest('[data-ref="card"]') || this.dataset.cartType === 'page') return;
    event.preventDefault();
    const button = /** @type {HTMLButtonElement | null} */ (form.querySelector('[type="submit"]'));
    if (button?.getAttribute('aria-disabled') === 'true') return;
    this.showError(form, '');
    this.pendingForm = form;
    button?.setAttribute('aria-disabled', 'true');
    button?.setAttribute('aria-busy', 'true');

    const added = await addToCart(this.dataset.cartAddUrl ?? '/cart/add', new FormData(form));

    button?.removeAttribute('aria-disabled');
    button?.removeAttribute('aria-busy');
    if (!added) return;
    this.pendingForm = null;
    if (this.openSpot) this.close(this.openSpot);
    const drawer = /** @type {any} */ (document.getElementById('CartDrawer'));
    if (drawer?.open) drawer.open(button);
    else window.location.href = this.dataset.cartUrl ?? '/cart';
  }

  /**
   * @param {HTMLFormElement} form
   * @param {string} message
   */
  showError(form, message) {
    const box = /** @type {HTMLElement | null} */ (form.querySelector('[data-ref="card-error"]'));
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }
}

define('aw-lookbook', Lookbook);
