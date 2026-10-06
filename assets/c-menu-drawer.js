/**
 * <aw-menu-drawer data-style="accordion|sliding"> — menu inside the header's menu drawer.
 *
 * Sliding style: each item with children is a <details data-ref="submenu"> whose content is a full-size
 * panel (data-ref="panel") covering the level below, with a Back button (data-ref="back"). While a panel is
 * open, everything it covers is made inert so Tab stays inside the panel; Back (or Escape inside a panel)
 * returns to the parent level and focuses the item that opened it. Closing the drawer resets to the top level.
 * Accordion style needs no script: native <details> expand in place.
 */
import { ThemeElement, define } from '@aw/component';

class MenuDrawer extends ThemeElement {
  mount() {
    if (this.dataset.style !== 'sliding') return;
    /** @type {{ details: HTMLDetailsElement, changed: HTMLElement[] }[]} */
    this.stack = [];

    // toggle does not bubble: listen in the capture phase.
    this.listen(this, 'toggle', (event) => {
      const details = /** @type {HTMLElement} */ (event.target);
      if (!(details instanceof HTMLDetailsElement) || details.dataset.ref !== 'submenu') return;
      if (details.open) this.enter(details);
      else if (this.stack.some((level) => level.details === details)) this.leave(details, false);
    }, { capture: true });

    this.listen(this, 'click', (event) => {
      const back = /** @type {HTMLElement} */ (event.target).closest('[data-ref="back"]');
      if (!back) return;
      const details = /** @type {HTMLDetailsElement | null} */ (back.closest('details[data-ref="submenu"]'));
      if (details) this.leave(details, true);
    });

    this.listen(this, 'keydown', (event) => {
      if (/** @type {KeyboardEvent} */ (event).key !== 'Escape' || this.stack.length === 0) return;
      // Step back one level instead of closing the whole drawer.
      event.preventDefault();
      event.stopPropagation();
      this.leave(this.stack[this.stack.length - 1].details, true);
    });

    const dialog = this.closest('dialog');
    if (dialog) this.listen(dialog, 'close', () => this.reset());
  }

  /** @param {HTMLDetailsElement} details */
  enter(details) {
    if (this.stack.some((level) => level.details === details)) return;
    const scope = /** @type {HTMLElement} */ (details.parentElement?.closest('[data-ref="panel"]') ?? this);
    /** @type {HTMLElement[]} */
    const changed = [];
    /** @type {HTMLElement | null} */
    let node = details;
    while (node && node !== scope && node.parentElement) {
      for (const sibling of node.parentElement.children) {
        const el = /** @type {HTMLElement} */ (sibling);
        if (el !== node && !el.inert) {
          el.inert = true;
          changed.push(el);
        }
      }
      node = node.parentElement;
    }
    const summary = /** @type {HTMLElement | null} */ (details.querySelector(':scope > summary'));
    if (summary) {
      summary.inert = true;
      changed.push(summary);
    }
    this.stack.push({ details, changed });
    /** @type {HTMLElement | null} */ (details.querySelector(':scope > [data-ref="panel"] [data-ref="back"]'))?.focus();
  }

  /**
   * @param {HTMLDetailsElement} details
   * @param {boolean} focusSummary
   */
  leave(details, focusSummary) {
    const index = this.stack.findIndex((level) => level.details === details);
    if (index === -1) return;
    // Leaving a level also leaves every level opened inside it.
    for (const level of this.stack.splice(index).reverse()) {
      for (const el of level.changed) el.inert = false;
      level.details.open = false;
    }
    if (focusSummary) /** @type {HTMLElement | null} */ (details.querySelector(':scope > summary'))?.focus();
  }

  reset() {
    if (this.stack?.length) this.leave(this.stack[0].details, false);
  }
}

define('aw-menu-drawer', MenuDrawer);
