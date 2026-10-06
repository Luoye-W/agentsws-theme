/**
 * <aw-popup> — decides when a timed popup (newsletter sign-up, age verification) opens, and remembers the answer.
 * The dialog itself is an <aw-modal> inside it (assets/c-modal.js): focus trap, Escape, scroll lock, focus return.
 *
 * Attributes:
 *   data-section-id   Section id, for opening / closing it while the section is selected in the theme editor
 *   data-key          Storage key suffix, e.g. "newsletter" or "age"
 *   data-delay        Seconds to wait after the page is visible (default 0)
 *   data-days         Days to stay quiet after it was dismissed / confirmed (default 30)
 *   data-test-mode    Present: ignore the remembered answer and show on every page load (and in the editor)
 *   data-require-confirm  Present: only an explicit confirm (a [data-popup-confirm] button) is remembered (age
 *                     verification; pair it with data-blocking on the <aw-modal>). A <button data-popup-decline>
 *                     reveals the [data-popup-declined] message when no "leave" link is configured.
 *   data-form-id      Id of a form inside. When the page loads with #<form-id> (Shopify's redirect after submitting),
 *                     the popup opens at once to show the result, and a success ([data-popup-success]) is remembered
 *                     for a year.
 *
 * Nothing is shown when browser storage is unavailable for dismissible popups (the frequency could not be honoured).
 */
import { ThemeElement, define } from '@aw/component';

const STORAGE_PREFIX = 'aw-popup:';
const DAY_MS = 86_400_000;

class Popup extends ThemeElement {
  /** @type {number | undefined} */
  timer;

  mount() {
    const designMode = Boolean(/** @type {any} */ (window).Shopify?.designMode);
    const testMode = this.hasAttribute('data-test-mode');

    this.listen(this, 'modal:close', (event) => {
      const reason = /** @type {CustomEvent} */ (event).detail?.reason;
      if (testMode || designMode) return;
      if (this.requireConfirm) {
        if (reason === 'confirm') this.remember(this.days);
      } else {
        this.remember(this.days);
      }
    });

    this.listen(this, 'click', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.closest('[data-popup-confirm]')) this.modal?.close('confirm');
      if (target.closest('button[data-popup-decline]')) {
        // No "leave" link configured: explain instead of doing nothing.
        const message = /** @type {HTMLElement | null} */ (this.querySelector('[data-popup-declined]'));
        if (message) {
          message.hidden = false;
          message.focus();
        }
      }
    });

    if (designMode) {
      this.listen(document, 'shopify:section:select', (event) => {
        if (/** @type {CustomEvent} */ (event).detail?.sectionId === this.dataset.sectionId) this.show();
      });
      this.listen(document, 'shopify:section:deselect', (event) => {
        if (/** @type {CustomEvent} */ (event).detail?.sectionId === this.dataset.sectionId) this.modal?.close('editor');
      });
      if (testMode) this.show();
      return;
    }

    const formId = this.dataset.formId;
    if (formId && window.location.hash === `#${formId}`) {
      if (this.querySelector('[data-popup-success]')) this.remember(365);
      this.show();
      return;
    }

    if (!testMode && !this.shouldShow()) return;
    this.whenVisible(() => {
      this.timer = window.setTimeout(() => this.show(), Number(this.dataset.delay || 0) * 1000);
    });
  }

  unmount() {
    window.clearTimeout(this.timer);
  }

  /** @returns {import('./c-modal.js').Modal | null} */
  get modal() {
    return /** @type {any} */ (this.querySelector('aw-modal'));
  }

  get requireConfirm() {
    return this.hasAttribute('data-require-confirm');
  }

  get days() {
    return Number(this.dataset.days || 30);
  }

  get storageKey() {
    return STORAGE_PREFIX + (this.dataset.key || 'popup');
  }

  /** @returns {boolean} */
  shouldShow() {
    try {
      const until = Number(window.localStorage.getItem(this.storageKey) || 0);
      return Date.now() > until;
    } catch {
      // Storage blocked: an age gate must still show; a marketing popup stays away rather than nagging.
      return this.requireConfirm;
    }
  }

  /** @param {number} days */
  remember(days) {
    try {
      window.localStorage.setItem(this.storageKey, String(Date.now() + days * DAY_MS));
    } catch {
      /* storage unavailable: nothing to remember */
    }
  }

  /** @param {() => void} callback */
  whenVisible(callback) {
    if (document.visibilityState === 'visible') {
      callback();
      return;
    }
    this.listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.timer === undefined) callback();
    });
  }

  async show() {
    await customElements.whenDefined('aw-modal');
    const modal = this.modal;
    if (!modal || modal.isOpen) return;
    // Do not stack on top of another open dialog (cart, menu); try again shortly. The age gate always goes on top.
    const otherOpen = [...document.querySelectorAll('dialog[open]')].some((d) => !this.contains(d));
    if (otherOpen && !this.requireConfirm) {
      this.timer = window.setTimeout(() => this.show(), 3000);
      return;
    }
    modal.open(null);
  }
}

define('aw-popup', Popup);
