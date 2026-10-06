/**
 * <aw-drawer id="…"> — side panel built on a native <dialog> (focus trap, Escape, top layer for free).
 *
 * Markup:
 *   <aw-drawer id="MenuDrawer"><dialog data-ref="dialog">… <button data-drawer-close>…</button></dialog></aw-drawer>
 *   Anywhere on the page: <button data-drawer-open="MenuDrawer" aria-controls="MenuDrawer">…</button>
 *   (a link with data-drawer-open keeps working as a normal link without JavaScript).
 * Clicking the backdrop closes it. Page scroll is locked while any drawer is open (drawers can stack).
 * Focus goes to the element with `autofocus` inside the dialog, else the first focusable one, and returns to the
 * opener on close. In the theme editor, selecting the drawer's section opens it.
 */
import { ThemeElement, define } from '@aw/component';

let openDrawers = 0;

export class Drawer extends ThemeElement {
  mount() {
    const dialog = this.dialog;
    if (!dialog) return;

    this.listen(document, 'click', (event) => {
      const trigger = /** @type {HTMLElement} */ (event.target).closest?.(`[data-drawer-open="${this.id}"]`);
      if (!trigger) return;
      event.preventDefault();
      this.open(/** @type {HTMLElement} */ (trigger));
    });

    this.listen(dialog, 'click', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target === dialog || target.closest('[data-drawer-close]')) this.close();
    });

    this.listen(dialog, 'close', () => {
      openDrawers = Math.max(0, openDrawers - 1);
      if (openDrawers === 0) document.documentElement.style.removeProperty('overflow');
      this.opener?.setAttribute('aria-expanded', 'false');
      if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    });

    // Theme editor: show the drawer while its section is selected.
    this.listen(document, 'shopify:section:select', (event) => {
      if (/** @type {HTMLElement} */ (event.target).contains(this)) this.open();
    });
    this.listen(document, 'shopify:section:deselect', (event) => {
      if (/** @type {HTMLElement} */ (event.target).contains(this)) this.close();
    });
  }

  unmount() {
    if (this.dialog?.open) {
      openDrawers = Math.max(0, openDrawers - 1);
      if (openDrawers === 0) document.documentElement.style.removeProperty('overflow');
    }
  }

  /** @returns {HTMLDialogElement | null} */
  get dialog() {
    return /** @type {HTMLDialogElement | null} */ (this.ref('dialog'));
  }

  /** @param {HTMLElement} [opener] - Element to return focus to on close */
  open(opener) {
    const dialog = this.dialog;
    if (!dialog || dialog.open) return;
    this.opener = opener ?? /** @type {HTMLElement | null} */ (document.activeElement);
    this.opener?.setAttribute('aria-expanded', 'true');
    openDrawers += 1;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
  }

  close() {
    this.dialog?.close();
  }
}

define('aw-drawer', Drawer);
