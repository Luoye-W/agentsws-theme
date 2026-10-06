/**
 * <aw-modal id="…"> — centered dialog (bottom sheet on phones, via the markup's classes) built on a native modal
 * <dialog>: focus trap, top layer, inert page and focus return come from the platform.
 *
 * Markup:
 *   <aw-modal id="AddressNew" [data-open-on-load] [data-blocking]>
 *     <dialog data-ref="dialog" aria-labelledby="…">… <button data-modal-close>…</button></dialog>
 *   </aw-modal>
 *   Anywhere on the page: <button data-modal-open="AddressNew" aria-haspopup="dialog">…</button>
 *
 * - Closes on Escape, the close button(s) and a click on the backdrop — unless data-blocking is set, in which case
 *   only code can close it (age verification). A blocking modal that the browser force-closes (e.g. Escape pressed
 *   twice in Chrome) is reopened at once.
 * - data-open-on-load opens it once the page is ready (a form inside came back with errors).
 * - Page scroll is locked while open. Focus returns to the element that opened it.
 * - Dispatches a bubbling "modal:close" event with detail { reason } ("dismiss" unless close(reason) said otherwise).
 */
import { ThemeElement, define } from '@aw/component';

export class Modal extends ThemeElement {
  /** @type {HTMLElement | null} */
  opener = null;
  reason = 'dismiss';

  mount() {
    const dialog = this.dialog;
    if (!dialog) return;

    this.listen(document, 'click', (event) => {
      const trigger = /** @type {HTMLElement} */ (event.target).closest?.(`[data-modal-open="${this.id}"]`);
      if (!trigger) return;
      event.preventDefault();
      this.open(/** @type {HTMLElement} */ (trigger));
    });

    this.listen(dialog, 'click', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.closest('[data-modal-close]')) this.close('dismiss');
      else if (target === dialog && !this.blocking) this.close('dismiss');
    });

    this.listen(dialog, 'cancel', (event) => {
      event.preventDefault();
      if (!this.blocking) this.close('dismiss');
    });

    this.listen(dialog, 'close', () => {
      if (this.blocking && this.reason === 'forced') {
        dialog.showModal();
        return;
      }
      document.documentElement.style.removeProperty('overflow');
      if (this.opener?.hasAttribute('data-modal-open')) this.opener.setAttribute('aria-expanded', 'false');
      if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
      this.dispatchEvent(new CustomEvent('modal:close', { bubbles: true, detail: { reason: this.reason } }));
    });

    if (this.hasAttribute('data-open-on-load')) queueMicrotask(() => this.open());
  }

  unmount() {
    if (this.dialog?.open) document.documentElement.style.removeProperty('overflow');
  }

  /** @returns {HTMLDialogElement | null} */
  get dialog() {
    return /** @type {HTMLDialogElement | null} */ (this.ref('dialog'));
  }

  /** @returns {boolean} */
  get blocking() {
    return this.hasAttribute('data-blocking');
  }

  /** @returns {boolean} */
  get isOpen() {
    return Boolean(this.dialog?.open);
  }

  /** @param {HTMLElement | null} [opener] - Element to return focus to on close */
  open(opener) {
    const dialog = this.dialog;
    if (!dialog || dialog.open) return;
    this.opener = opener ?? /** @type {HTMLElement | null} */ (document.activeElement);
    if (this.opener?.hasAttribute('data-modal-open')) this.opener.setAttribute('aria-expanded', 'true');
    // A blocking modal that closes without an explicit close(reason) was force-closed by the browser.
    this.reason = this.blocking ? 'forced' : 'dismiss';
    if (!this.hasAttribute('data-no-scroll-lock')) document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
  }

  /** @param {string} [reason] - Why it closed, passed on in the "modal:close" event */
  close(reason = 'dismiss') {
    this.reason = reason;
    this.dialog?.close();
  }
}

define('aw-modal', Modal);
