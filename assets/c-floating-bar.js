/**
 * <aw-floating-bar> — the vertical pill at the screen edge (sections/floating-bar.liquid).
 *
 * - Tab button (data-ref="tab"): when the newsletter popup (sections/newsletter-popup.liquid →
 *   <aw-popup data-key="newsletter"> with an <aw-modal> inside) is on the page, clicking the tab opens that popup,
 *   whatever the popup's delay or "don't show again" memory says. A tab rendered as a link keeps working as a link
 *   when there is no popup; a tab rendered as a <button> (no link set) stays hidden when there is no popup.
 * - data-hide-on-scroll: fades out while the page scrolls down (after the first 200px) and comes back on scroll up.
 *   While hidden it is inert (not focusable); it never hides while focus is inside it.
 * - The whole bar hides itself when it ends up with nothing to show.
 */
import { ThemeElement, define } from '@aw/component';

const SCROLL_START = 200;
const SCROLL_DELTA = 8;

class FloatingBar extends ThemeElement {
  mount() {
    const tab = this.ref('tab');
    const popupModal = /** @type {any} */ (document.querySelector('aw-popup[data-key="newsletter"] aw-modal'));

    if (tab && popupModal) {
      tab.hidden = false;
      tab.setAttribute('aria-haspopup', 'dialog');
      this.listen(tab, 'click', async (event) => {
        event.preventDefault();
        await customElements.whenDefined('aw-modal');
        popupModal.open(tab);
      });
    }

    const hasContent = [...this.querySelectorAll('a, button')].some((el) => !(/** @type {HTMLElement} */ (el).hidden));
    if (!hasContent && !(/** @type {any} */ (window).Shopify?.designMode)) {
      this.hidden = true;
      return;
    }

    if (this.hasAttribute('data-hide-on-scroll')) {
      this.lastY = window.scrollY;
      this.frame = 0;
      this.listen(window, 'scroll', () => {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => this.onScroll());
      }, { passive: true });
    }
  }

  unmount() {
    cancelAnimationFrame(this.frame ?? 0);
  }

  onScroll() {
    const y = window.scrollY;
    const delta = y - (this.lastY ?? 0);
    if (Math.abs(delta) < SCROLL_DELTA) return;
    this.lastY = y;
    const hide = delta > 0 && y > SCROLL_START && !this.contains(document.activeElement);
    this.toggleAttribute('data-hidden', hide);
    this.inert = hide;
  }
}

define('aw-floating-bar', FloatingBar);
