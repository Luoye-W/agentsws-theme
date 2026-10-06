/**
 * <aw-quick-add> — the "+" button on product cards (snippets/quick-add.liquid).
 *
 * - data-ref="add" (single-variant products): adds the variant to the cart without leaving the page and opens the
 *   cart drawer (or goes to the cart page when Theme settings → Cart uses the page).
 * - data-ref="view" (products with options): loads sections/product-quick-view for that product through the
 *   Section Rendering API and shows it as a modal <dialog>. The window reuses the product page's components
 *   (<aw-product>, <aw-product-form>, <aw-gallery>), so variant switching and adding work exactly as on the page.
 *
 * Emits `aw:quick-view:opened` once the window is shown.
 */
import { ThemeElement, define } from '@aw/component';
import { emit, ThemeEvents } from '@aw/events';
import { addToCart } from '@aw/cart';

class QuickAdd extends ThemeElement {
  #busy = false;

  mount() {
    const add = this.ref('add');
    const view = this.ref('view');
    if (add) this.listen(add, 'click', () => this.add(add));
    if (view) this.listen(view, 'click', () => this.view(view));

    this.listen(document, ThemeEvents.cartError, (event) => {
      if (!this.#busy) return;
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.showError(detail.message || this.dataset.errorText || '');
    });
  }

  /** @param {HTMLElement} button */
  async add(button) {
    if (this.#busy) return;
    this.#busy = true;
    this.showError('');
    button.setAttribute('aria-busy', 'true');
    const data = new FormData();
    data.set('id', button.dataset.variantId ?? '');
    data.set('quantity', button.dataset.quantity || '1');
    const added = await addToCart(this.dataset.cartAddUrl ?? '/cart/add', data);
    this.#busy = false;
    button.removeAttribute('aria-busy');
    if (!added) return;
    const drawer = /** @type {any} */ (document.getElementById('CartDrawer'));
    if (drawer?.open && this.dataset.cartType !== 'page') drawer.open(button);
    else window.location.href = this.dataset.cartUrl ?? '/cart';
  }

  /** @param {HTMLElement} button */
  async view(button) {
    if (this.#busy) return;
    this.#busy = true;
    button.setAttribute('aria-busy', 'true');
    const url = button.dataset.url ?? '';
    const opened = await openQuickView(url, button);
    this.#busy = false;
    button.removeAttribute('aria-busy');
    // Fall back to the product page when the window cannot be loaded.
    if (!opened) window.location.href = url.split('?')[0];
  }

  /** @param {string} message */
  showError(message) {
    const box = this.ref('error');
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
    if (message) window.setTimeout(() => { box.hidden = true; }, 5000);
  }
}

/** @type {AbortController | null} */
let pending = null;

/**
 * Fetch the quick view section for a product and show it as a modal dialog.
 * @param {string} url - Product URL with ?section_id=product-quick-view
 * @param {HTMLElement} opener - Focus returns here when the window closes
 * @returns {Promise<boolean>} true when shown
 */
export async function openQuickView(url, opener) {
  pending?.abort();
  pending = new AbortController();
  let doc;
  try {
    const response = await fetch(url, { signal: pending.signal });
    if (!response.ok) return false;
    doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  } catch (error) {
    return /** @type {Error} */ (error).name === 'AbortError';
  }
  const source = doc.querySelector('dialog[data-quick-view]');
  if (!source) return false;

  document.getElementById('QuickView')?.remove();
  const dialog = /** @type {HTMLDialogElement & { returnFocusTo?: HTMLElement }} */ (document.importNode(source, true));
  dialog.id = 'QuickView';
  dialog.returnFocusTo = opener;
  document.body.append(dialog);
  loadScripts(doc);

  dialog.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (target === dialog || target.closest('[data-quick-view-close]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    // Another modal (the cart drawer after "Add to cart") may already be open: leave scroll lock and focus to it.
    if (document.querySelector('dialog[open]')) return;
    document.documentElement.style.removeProperty('overflow');
    opener.focus({ preventScroll: true });
  });

  document.documentElement.style.overflow = 'hidden';
  dialog.showModal();
  /** @type {any} */ (window).Shopify?.PaymentButton?.init?.();
  emit(ThemeEvents.quickViewOpened, { url });
  return true;
}

/**
 * Module scripts inside a fetched fragment do not run when inserted; add the ones this page has not loaded yet.
 * @param {Document} doc
 */
function loadScripts(doc) {
  for (const script of doc.querySelectorAll('script[type="module"][src]')) {
    const src = script.getAttribute('src') ?? '';
    if (document.querySelector(`script[src="${CSS.escape(src)}"]`)) continue;
    const next = document.createElement('script');
    next.type = 'module';
    next.src = src;
    document.head.append(next);
  }
}

define('aw-quick-add', QuickAdd);
