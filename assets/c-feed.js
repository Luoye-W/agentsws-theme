/**
 * <aw-feed> — moves between the post windows of a "Shop the feed" section (sections/shop-the-feed.liquid).
 *
 * Each post has its own <aw-modal id="…"> (assets/c-modal.js), opened by the tile's
 * <button data-modal-open="…">. This element only adds navigation between them:
 *   <button data-feed-go="<modal id>" data-dir="prev|next">  — close the open post, open that one
 *   ArrowLeft / ArrowRight inside an open post window     — same as the previous / next buttons
 *                                                           (mirrored in right-to-left languages;
 *                                                           ignored while typing or on a video)
 * Focus returns to the tile of the post that was open last, so keyboard users land where they left off.
 */
import { ThemeElement, define } from '@aw/component';

class Feed extends ThemeElement {
  mount() {
    this.listen(this, 'click', (event) => {
      const button = /** @type {HTMLElement} */ (event.target).closest?.('[data-feed-go]');
      if (!(button instanceof HTMLElement) || !this.contains(button)) return;
      const id = button.dataset.feedGo;
      if (!id) return;
      event.preventDefault();
      this.go(id);
    });

    this.listen(this, 'keydown', (event) => {
      const key = /** @type {KeyboardEvent} */ (event).key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.closest('input, textarea, select, video, [contenteditable="true"]')) return;
      const dialog = target.closest('dialog[open]');
      if (!dialog || !this.contains(dialog)) return;
      const rtl = getComputedStyle(dialog).direction === 'rtl';
      const forward = (key === 'ArrowRight') !== rtl;
      const button = /** @type {HTMLButtonElement | null} */ (
        dialog.querySelector(`[data-feed-go][data-dir="${forward ? 'next' : 'prev'}"]`)
      );
      if (!button || button.disabled || !button.dataset.feedGo) return;
      event.preventDefault();
      this.go(button.dataset.feedGo);
    });
  }

  /**
   * Close the open post window (if any) and open the one with this id.
   * @param {string} id - Id of the target <aw-modal>
   */
  async go(id) {
    await customElements.whenDefined('aw-modal');
    const target = /** @type {import('./c-modal.js').Modal | null} */ (/** @type {any} */ (document.getElementById(id)));
    if (!target || !this.contains(target) || target.isOpen) return;
    const current = /** @type {import('./c-modal.js').Modal | null} */ (
      /** @type {any} */ (this.querySelector('dialog[open]')?.closest('aw-modal') ?? null)
    );
    const opener = /** @type {HTMLElement | null} */ (this.querySelector(`[data-modal-open="${CSS.escape(id)}"]`));
    if (current?.dialog) {
      // The old window's "close" event (which unlocks page scroll) can arrive after the next window opened:
      // lock the page again when it does.
      current.dialog.addEventListener(
        'close',
        () => {
          if (target.isOpen) document.documentElement.style.overflow = 'hidden';
        },
        { once: true },
      );
      current.close('navigate');
    }
    target.open(opener);
  }
}

define('aw-feed', Feed);
