/**
 * <aw-anchor-nav [data-sticky] [data-highlight]> — in-page navigation with scroll spy (sections/anchor-nav.liquid).
 *
 * - Each link (data-ref="link") names one or more targets in data-targets ("faq,reviews"). A target is an element id
 *   or a section key from the template JSON: "faq" also finds the wrapper #shopify-section-template--…__faq.
 *   The first target is where a click scrolls to; every target counts for highlighting. Missing targets are skipped.
 * - Click: smooth scroll (instant with reduced motion) so the target starts just below the bar, then focus moves to
 *   the target (tabindex="-1" is added when needed) without scrolling again.
 * - data-highlight: the link whose target contains the line just below the bar gets aria-current="location" and is
 *   scrolled into view inside the bar (at the very bottom of the page: the last target on screen). The back-to-top link (data-ref="top") scrolls to the top and focuses <main>.
 * - The link list gets data-fade="start|end|both" while it can scroll sideways (edge fade in CSS).
 */
import { ThemeElement, define } from '@aw/component';

const GAP = 20;

/**
 * Find a target by element id or by the section key at the end of a Shopify section wrapper id.
 * @param {string} key
 * @returns {HTMLElement | null}
 */
export function findTarget(key) {
  if (!key) return null;
  return (
    document.getElementById(key) ??
    /** @type {HTMLElement | null} */ (document.querySelector(`[id^="shopify-section-"][id$="__${CSS.escape(key)}"]`))
  );
}

class AnchorNav extends ThemeElement {
  mount() {
    this.links = /** @type {HTMLAnchorElement[]} */ (this.refs('link'));
    this.list = this.ref('list');
    this.ticking = false;

    for (const link of this.links) {
      this.listen(link, 'click', (event) => {
        const target = this.targetsOf(link)[0];
        if (!target) return;
        event.preventDefault();
        this.scrollToTarget(target);
      });
    }

    const top = this.ref('top');
    if (top) {
      this.listen(top, 'click', (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: this.reduced() ? 'auto' : 'smooth' });
        const main = document.getElementById('MainContent');
        main?.focus({ preventScroll: true });
      });
    }

    const onScroll = () => {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        this.ticking = false;
        if (this.hasAttribute('data-highlight')) this.highlight();
      });
    };
    this.listen(window, 'scroll', onScroll, { passive: true });
    this.listen(window, 'resize', () => {
      this.updateFade();
      onScroll();
    });
    if (this.list) this.listen(this.list, 'scroll', () => this.updateFade(), { passive: true });

    this.updateFade();
    if (this.hasAttribute('data-highlight')) this.highlight();
  }

  reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * @param {HTMLElement} link
   * @returns {HTMLElement[]}
   */
  targetsOf(link) {
    return (link.dataset.targets ?? '')
      .split(',')
      .map((key) => findTarget(key.trim()))
      .filter((el) => el !== null && !this.contains(el));
  }

  /** Distance from the viewport top to just below the bar (where a section counts as "in view"). */
  offset() {
    const bar = this.ref('bar');
    if (!bar || !this.hasAttribute('data-sticky')) return (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0) + GAP;
    const wrapper = /** @type {HTMLElement} */ (this.parentElement ?? this);
    const stickyTop = Number.parseFloat(getComputedStyle(wrapper).top) || 0;
    const barBottom = stickyTop + (bar.getBoundingClientRect().bottom - wrapper.getBoundingClientRect().top);
    return barBottom + GAP;
  }

  /** @param {HTMLElement} target */
  scrollToTarget(target) {
    const y = target.getBoundingClientRect().top + window.scrollY - this.offset() + GAP / 2;
    window.scrollTo({ top: Math.max(0, y), behavior: this.reduced() ? 'auto' : 'smooth' });
    if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  highlight() {
    const line = this.offset();
    /** @type {HTMLElement | null} */
    let active = null;
    for (const link of this.links ?? []) {
      const inView = this.targetsOf(link).some((target) => {
        const rect = target.getBoundingClientRect();
        return rect.top <= line && rect.bottom > line;
      });
      if (inView) active = link;
    }
    // At the very bottom of the page the last sections may never reach the line: take the last one on screen.
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atBottom) {
      for (const link of this.links ?? []) {
        if (this.targetsOf(link).some((target) => target.getBoundingClientRect().top < window.innerHeight * 0.75)) active = link;
      }
    }
    for (const link of this.links ?? []) {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    if (active && active !== this.active) this.reveal(active);
    this.active = active;
  }

  /**
   * Scroll the link list (not the page) so the active link is visible.
   * @param {HTMLElement} link
   */
  reveal(link) {
    const list = this.list;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const box = list.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.left >= box.left && item.right <= box.right) return;
    list.scrollTo({
      left: list.scrollLeft + item.left - box.left - (box.width - item.width) / 2,
      behavior: this.reduced() ? 'auto' : 'smooth',
    });
  }

  updateFade() {
    const list = this.list;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    if (max <= 1) {
      list.removeAttribute('data-fade');
      return;
    }
    const position = Math.abs(list.scrollLeft);
    const start = position > 1;
    const end = position < max - 1;
    list.setAttribute('data-fade', start && end ? 'both' : start ? 'start' : 'end');
  }
}

define('aw-anchor-nav', AnchorNav);
