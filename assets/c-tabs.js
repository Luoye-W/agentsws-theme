/**
 * <aw-tabs data-section-id="…"> — accessible tabs (WAI-ARIA tabs pattern) whose hidden panels can load later.
 *
 * Markup:
 *   <aw-tabs data-section-id="{{ section.id }}">
 *     <div role="tablist"> <button role="tab" id="…" aria-controls="…" aria-selected tabindex data-ref="tab"> … </div>
 *     <div role="tabpanel" id="…" aria-labelledby="…" data-ref="panel" [hidden]>
 *       <div data-swap="panel-…" data-pending>…</div>    ← empty until loaded
 *     </div>
 *   </aw-tabs>
 *
 * - Only the selected tab is in the Tab order (roving tabindex); Arrow keys move between tabs and select them,
 *   Home / End jump to the first / last. Right-to-left languages swap the arrow directions.
 * - Panels marked data-pending are filled from one Section Rendering API request (current page with
 *   ?section_id=…), made when the visitor first points at or focuses the tab list, or selects a tab.
 * - Theme editor: selecting a tab block selects its tab.
 */
import { ThemeElement, define, swapFromHTML } from '@aw/component';

class Tabs extends ThemeElement {
  mount() {
    const tablist = this.querySelector('[role="tablist"]');
    if (!tablist) return;

    for (const tab of this.tabs) {
      this.listen(tab, 'click', () => this.select(tab));
    }
    this.listen(tablist, 'keydown', (event) => this.onKeydown(/** @type {KeyboardEvent} */ (event)));
    this.listen(tablist, 'pointerenter', () => this.load(), { once: true });
    this.listen(tablist, 'focusin', () => this.load(), { once: true });
    this.listen(document, 'shopify:block:select', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      const tab = this.tabs.find((t) => t === target || t.contains(target));
      if (tab) this.select(tab, false);
    });
  }

  /** @returns {HTMLElement[]} */
  get tabs() {
    return this.refs('tab');
  }

  /** @param {KeyboardEvent} event */
  onKeydown(event) {
    const tabs = this.tabs;
    const index = tabs.indexOf(/** @type {HTMLElement} */ (event.target));
    if (index < 0) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (event.key === forward) next = (index + 1) % tabs.length;
    else if (event.key === backward) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    this.select(tabs[next]);
  }

  /**
   * @param {HTMLElement} tab
   * @param {boolean} [focus] - Move keyboard focus to the tab (off for editor selection)
   */
  select(tab, focus = true) {
    for (const other of this.tabs) {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(other.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !selected;
    }
    if (focus) tab.focus();
    const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
    if (panel?.querySelector('[data-pending]')) this.load();
  }

  async load() {
    if (this.loading || !this.querySelector('[data-pending]') || !this.dataset.sectionId) return;
    this.loading = true;
    this.setAttribute('aria-busy', 'true');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('section_id', this.dataset.sectionId);
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      swapFromHTML(this, await response.text());
    } catch {
      // Keep the "could not load" hint inside pending panels; the next interaction retries.
      for (const pending of this.querySelectorAll('[data-pending]')) pending.setAttribute('data-failed', '');
    } finally {
      this.loading = false;
      this.removeAttribute('aria-busy');
    }
  }
}

define('aw-tabs', Tabs);
