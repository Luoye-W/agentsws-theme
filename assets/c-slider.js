/**
 * <aw-slider> — native horizontal scroll track (CSS scroll-snap) with previous / next buttons.
 *
 * Markup:
 *   <aw-slider>
 *     <ul data-ref="track" class="flex overflow-x-auto snap-x …">  ← direct children are the slides
 *     {% render 'slider-buttons' %}                                 ← data-ref="controls" / "prev" / "next"
 *     <button data-ref="nav" data-index="0">…</button>              ← optional: jump to a slide (timeline)
 *   </aw-slider>
 *
 * - Buttons scroll by one visible width; they are disabled at the ends and the controls hide when
 *   everything fits (so a track that only scrolls on mobile shows no buttons on desktop).
 * - The track becomes keyboard focusable (arrow keys scroll it) only while it overflows.
 * - The slide nearest the start edge gets data-current; nav buttons get aria-current="true".
 * - Theme editor: selecting a block scrolls its slide into view.
 * - Reduced motion: jumps instead of smooth scrolling. Works in right-to-left languages.
 */
import { ThemeElement, define } from '@aw/component';

class Slider extends ThemeElement {
  mount() {
    this.track = this.ref('track');
    if (!this.track) return;
    this.frame = 0;

    const prev = this.ref('prev');
    const next = this.ref('next');
    if (prev) this.listen(prev, 'click', () => this.page(-1));
    if (next) this.listen(next, 'click', () => this.page(1));

    for (const nav of this.refs('nav')) {
      this.listen(nav, 'click', () => this.goTo(Number(nav.dataset.index ?? 0)));
    }

    this.listen(this.track, 'scroll', () => this.schedule(), { passive: true });
    this.listen(document, 'shopify:block:select', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      const slide = this.slides.find((s) => s === target || s.contains(target));
      if (slide) this.goTo(this.slides.indexOf(slide), 'auto');
    });

    this.resizeObserver = new ResizeObserver(() => this.schedule());
    this.resizeObserver.observe(this.track);
    this.update();
  }

  unmount() {
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  /** @returns {HTMLElement[]} */
  get slides() {
    return this.track ? /** @type {HTMLElement[]} */ ([...this.track.children]) : [];
  }

  get isRtl() {
    return getComputedStyle(this.track ?? this).direction === 'rtl';
  }

  /** @returns {ScrollBehavior} */
  get behavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.update());
  }

  /** @param {number} direction - -1 previous, 1 next (in reading order) */
  page(direction) {
    const track = this.track;
    if (!track) return;
    const sign = this.isRtl ? -1 : 1;
    track.scrollBy({ left: direction * sign * track.clientWidth, behavior: this.behavior });
  }

  /**
   * Scroll so the slide at `index` sits at the start edge.
   * @param {number} index
   * @param {ScrollBehavior} [behavior]
   */
  goTo(index, behavior = this.behavior) {
    const track = this.track;
    const slide = this.slides[index];
    if (!track || !slide) return;
    const trackBox = track.getBoundingClientRect();
    const slideBox = slide.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
    const delta = this.isRtl ? slideBox.right - trackBox.right + padding : slideBox.left - trackBox.left - padding;
    track.scrollBy({ left: delta, behavior });
  }

  update() {
    const track = this.track;
    if (!track) return;
    const overflow = track.scrollWidth > track.clientWidth + 1;
    const position = Math.abs(track.scrollLeft);
    const atStart = position <= 1;
    const atEnd = position + track.clientWidth >= track.scrollWidth - 1;

    const controls = this.ref('controls');
    if (controls) controls.hidden = !overflow;
    const prev = /** @type {HTMLButtonElement | null} */ (this.ref('prev'));
    const next = /** @type {HTMLButtonElement | null} */ (this.ref('next'));
    if (prev) prev.disabled = atStart;
    if (next) next.disabled = atEnd;

    if (overflow) {
      track.setAttribute('tabindex', '0');
    } else {
      track.removeAttribute('tabindex');
    }

    // Current slide: the one whose start edge is closest to the track's start edge.
    const trackBox = track.getBoundingClientRect();
    const rtl = this.isRtl;
    let current = 0;
    let best = Infinity;
    this.slides.forEach((slide, index) => {
      const box = slide.getBoundingClientRect();
      const distance = Math.abs(rtl ? trackBox.right - box.right : box.left - trackBox.left);
      if (distance < best) {
        best = distance;
        current = index;
      }
    });
    if (atEnd && overflow) current = Math.max(current, this.lastVisibleIndex(trackBox, rtl));

    if (current === this.current) return;
    const initial = this.current === undefined;
    this.current = current;
    this.slides.forEach((slide, index) => slide.toggleAttribute('data-current', index === current));
    for (const nav of this.refs('nav')) {
      if (Number(nav.dataset.index) === current) {
        nav.setAttribute('aria-current', 'true');
        if (!initial) this.centerNav(nav);
      } else {
        nav.removeAttribute('aria-current');
      }
    }
  }

  /**
   * Keep the current nav button visible when the nav bar itself scrolls sideways
   * (only horizontal scrolling, so the page never jumps).
   * @param {HTMLElement} nav
   */
  centerNav(nav) {
    const bar = this.ref('nav-bar');
    if (!bar || bar.scrollWidth <= bar.clientWidth) return;
    const barBox = bar.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    bar.scrollBy({ left: navBox.left + navBox.width / 2 - (barBox.left + barBox.width / 2), behavior: this.behavior });
  }

  /**
   * At the very end of the track, the last slide that is fully visible counts as current,
   * so the final nav item can be reached even when several slides fit on screen.
   * @param {DOMRect} trackBox
   * @param {boolean} rtl
   */
  lastVisibleIndex(trackBox, rtl) {
    let last = 0;
    this.slides.forEach((slide, index) => {
      const box = slide.getBoundingClientRect();
      const inside = rtl ? box.left >= trackBox.left - 1 : box.right <= trackBox.right + 1;
      if (inside) last = index;
    });
    return last === this.slides.length - 1 ? last : 0;
  }
}

define('aw-slider', Slider);
