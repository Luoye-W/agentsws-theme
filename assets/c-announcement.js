/**
 * <aw-announcement data-mode="rotate|marquee" data-autoplay data-interval data-label-pause data-label-play> —
 * announcement bar messages.
 *
 * Rotate: one message ([data-ref="slide"]) visible at a time; the others are `hidden`, so their links cannot be
 * focused. Auto-advance pauses while hovered or focused and with the visible pause button (with reduced motion the
 * messages switch without animation); arrows (data-ref prev/next) step manually and announce the new message politely.
 * Marquee: the message group is repeated to fill the bar and cloned once so the CSS animation can loop; copies are
 * hidden from assistive technology and not focusable. The pause button stops the movement.
 * Theme editor: selecting a message shows it and stops auto-advance.
 */
import { ThemeElement, define } from '@aw/component';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

class Announcement extends ThemeElement {
  mount() {
    this.paused = false;
    this.hovering = false;
    const pause = this.ref('pause');
    if (pause) this.listen(pause, 'click', () => this.setPaused(!this.paused));

    if (this.dataset.mode === 'marquee') this.mountMarquee();
    else this.mountRotate();
  }

  unmount() {
    window.clearInterval(this.timer);
  }

  mountRotate() {
    this.slides = this.refs('slide');
    if (this.slides.length < 2) return;
    this.index = 0;
    this.show(0, false);
    this.setAttribute('data-ready', '');

    const prev = this.ref('prev');
    const next = this.ref('next');
    if (prev) this.listen(prev, 'click', () => this.show(this.index - 1, true));
    if (next) this.listen(next, 'click', () => this.show(this.index + 1, true));

    this.listen(this, 'pointerenter', () => { this.hovering = true; this.sync(); });
    this.listen(this, 'pointerleave', () => { this.hovering = false; this.sync(); });
    this.listen(this, 'focusin', () => { this.hovering = true; this.sync(); });
    this.listen(this, 'focusout', (event) => {
      if (this.contains(/** @type {Node | null} */ (/** @type {FocusEvent} */ (event).relatedTarget))) return;
      this.hovering = false;
      this.sync();
    });

    this.listen(document, 'shopify:block:select', (event) => {
      const index = this.slides?.indexOf(/** @type {HTMLElement} */ (event.target)) ?? -1;
      if (index === -1) return;
      this.setPaused(true);
      this.show(index, false);
    });

    this.sync();
  }

  /**
   * @param {number} index
   * @param {boolean} announce - Read the new message (manual navigation only)
   */
  show(index, announce) {
    const slides = this.slides ?? [];
    this.index = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== this.index;
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} / ${slides.length}`);
    });
    const viewport = this.ref('viewport');
    if (viewport) viewport.setAttribute('aria-live', announce ? 'polite' : 'off');
  }

  /** Start or stop auto-advance from the current state. */
  sync() {
    window.clearInterval(this.timer);
    const auto = this.dataset.autoplay === 'true';
    if (!auto || this.paused || this.hovering || (this.slides?.length ?? 0) < 2) return;
    const seconds = Number(this.dataset.interval) || 5;
    this.timer = window.setInterval(() => this.show((this.index ?? 0) + 1, false), seconds * 1000);
  }

  /** @param {boolean} paused */
  setPaused(paused) {
    this.paused = paused;
    this.toggleAttribute('data-paused', paused);
    const button = this.ref('pause');
    if (button) {
      button.setAttribute('aria-label', (paused ? this.dataset.labelPlay : this.dataset.labelPause) ?? '');
      const pauseIcon = this.ref('pause-icon');
      const playIcon = this.ref('play-icon');
      if (pauseIcon) pauseIcon.hidden = paused;
      if (playIcon) playIcon.hidden = !paused;
    }
    if (this.dataset.mode !== 'marquee') this.sync();
  }

  mountMarquee() {
    const track = this.ref('track');
    const group = this.ref('group');
    if (!track || !group || reducedMotion.matches || group.children.length === 0) return;

    const originals = [...group.children];
    const wanted = Math.max(this.clientWidth, window.innerWidth);
    let guard = 0;
    while (group.scrollWidth < wanted && guard < 12) {
      for (const item of originals) group.append(copyOf(/** @type {HTMLElement} */ (item)));
      guard += 1;
    }
    track.append(copyOf(group));
    this.setAttribute('data-ready', '');
  }
}

/**
 * A decorative copy: hidden from assistive technology, not focusable, not selectable in the theme editor.
 * @param {HTMLElement} element
 * @returns {HTMLElement}
 */
function copyOf(element) {
  const copy = /** @type {HTMLElement} */ (element.cloneNode(true));
  for (const el of [copy, ...copy.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) if (attr.name.startsWith('data-shopify')) el.removeAttribute(attr.name);
    el.removeAttribute('id');
    if (el.getAttribute('data-ref') === 'group') el.removeAttribute('data-ref');
  }
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  return copy;
}

define('aw-announcement', Announcement);
