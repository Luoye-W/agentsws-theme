/**
 * <aw-header data-sticky-mode="none|always|scroll_up" data-open-on="click|hover"> — desktop dropdowns and mega menus
 * built on <details>: one open at a time, optional hover opening (mouse only), closes on outside click, Escape and focus
 * leaving; arrow keys move between links of an open panel. Sticky modes: marks data-scrolled once the page scrolls
 * past the header (a transparent header turns solid) and, in scroll_up mode, sets data-hidden while scrolling down.
 * Publishes the header height as --header-h (sticky product columns, transparent header overlap).
 */
import { ThemeElement, define } from '@aw/component';

const HOVER_CLOSE_DELAY = 180;

class Header extends ThemeElement {
  mount() {
    const menus = /** @type {HTMLDetailsElement[]} */ (this.refs('menu'));
    /** @type {string} */
    let lastPointer = 'mouse';
    this.listen(this, 'pointerdown', (event) => {
      lastPointer = /** @type {PointerEvent} */ (event).pointerType;
    });

    for (const menu of menus) {
      const summary = /** @type {HTMLElement} */ (menu.querySelector('summary'));
      /** @type {number | undefined} */
      let closeTimer;

      this.listen(menu, 'toggle', () => {
        if (!menu.open) return;
        for (const other of menus) if (other !== menu) other.open = false;
      });

      this.listen(menu, 'focusout', (event) => {
        const next = /** @type {FocusEvent} */ (event).relatedTarget;
        if (!next || !menu.contains(/** @type {Node} */ (next))) menu.open = false;
      });

      if (this.dataset.openOn === 'hover') {
        this.listen(menu, 'pointerenter', (event) => {
          if (/** @type {PointerEvent} */ (event).pointerType !== 'mouse') return;
          window.clearTimeout(closeTimer);
          menu.open = true;
        });
        this.listen(menu, 'pointerleave', (event) => {
          if (/** @type {PointerEvent} */ (event).pointerType !== 'mouse') return;
          closeTimer = window.setTimeout(() => {
            if (!menu.contains(document.activeElement)) menu.open = false;
          }, HOVER_CLOSE_DELAY);
        });
        // With hover opening, a mouse click on the top-level item follows its own link. Keyboard (detail 0) and
        // touch still toggle the panel.
        this.listen(summary, 'click', (event) => {
          const url = summary.dataset.url;
          if (/** @type {MouseEvent} */ (event).detail === 0 || lastPointer !== 'mouse' || !url || url === '#') return;
          event.preventDefault();
          window.location.href = url;
        });
      }
    }

    this.listen(document, 'click', (event) => {
      for (const menu of menus) if (menu.open && !menu.contains(/** @type {Node} */ (event.target))) menu.open = false;
    });

    this.listen(this, 'keydown', (event) => {
      const key = /** @type {KeyboardEvent} */ (event).key;
      const open = menus.find((m) => m.open);
      if (key === 'Escape') {
        if (!open) return;
        open.open = false;
        open.querySelector('summary')?.focus();
        return;
      }
      if (key !== 'ArrowDown' && key !== 'ArrowUp') return;
      const target = /** @type {HTMLElement} */ (event.target);
      const menu = /** @type {HTMLDetailsElement | null} */ (target.closest('[data-ref="menu"]'));
      if (!menu) return;
      event.preventDefault();
      if (!menu.open) menu.open = true;
      const links = /** @type {HTMLElement[]} */ ([...menu.querySelectorAll('[data-ref="panel"] a[href]')]);
      if (links.length === 0) return;
      const index = links.indexOf(target);
      const step = key === 'ArrowDown' ? 1 : -1;
      const next = index === -1 ? (step === 1 ? 0 : links.length - 1) : (index + step + links.length) % links.length;
      links[next].focus();
    });

    // Theme editor: open the dropdown that holds a selected "Mega menu" block.
    this.listen(document, 'shopify:block:select', (event) => {
      const menu = /** @type {HTMLElement} */ (event.target).closest?.('[data-ref="menu"]');
      if (menu && this.contains(menu)) /** @type {HTMLDetailsElement} */ (menu).open = true;
    });
    this.listen(document, 'shopify:block:deselect', (event) => {
      const menu = /** @type {HTMLElement} */ (event.target).closest?.('[data-ref="menu"]');
      if (menu && this.contains(menu)) /** @type {HTMLDetailsElement} */ (menu).open = false;
    });

    this.observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-h', `${Math.round(this.getBoundingClientRect().height)}px`);
    });
    this.observer.observe(this);

    const mode = this.dataset.stickyMode;
    if (mode === 'always' || mode === 'scroll_up') this.watchScroll(mode, menus);
  }

  /**
   * @param {string} mode
   * @param {HTMLDetailsElement[]} menus
   */
  watchScroll(mode, menus) {
    let lastY = window.scrollY;
    let ticking = false;
    const wrapper = /** @type {HTMLElement} */ (this.parentElement ?? this);

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const height = this.offsetHeight;
      // The wrapper is sticky, so its own offset moves; measure where it starts from the element before it.
      const previous = wrapper.previousElementSibling;
      const top = previous ? Math.max(0, previous.getBoundingClientRect().bottom + y) : 0;

      // Hysteresis (±10px) so the solid/transparent switch does not flicker at the threshold.
      if (!this.hasAttribute('data-scrolled') && y > top + height + 10) this.setAttribute('data-scrolled', '');
      else if (this.hasAttribute('data-scrolled') && y < top + height - 10) this.removeAttribute('data-scrolled');

      if (y > top + height * 2) for (const menu of menus) if (menu.open && !menu.contains(document.activeElement)) menu.open = false;

      if (mode === 'scroll_up') {
        const busy = menus.some((m) => m.open) || this.contains(document.activeElement);
        const hide = y > lastY && y > top + height + 100 && !busy;
        if (hide) this.setAttribute('data-hidden', '');
        else if (y < lastY || y <= top + height) this.removeAttribute('data-hidden');
      }
      lastY = y;
    };

    this.listen(window, 'scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    this.listen(this, 'focusin', () => this.removeAttribute('data-hidden'));
    update();
  }

  unmount() {
    this.observer?.disconnect();
  }
}

define('aw-header', Header);
