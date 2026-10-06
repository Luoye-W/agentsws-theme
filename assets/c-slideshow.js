/**
 * <aw-slideshow> — slides in a scroll-snap track (native swipe), with previous/next buttons, dots,
 * arrow keys and optional autoplay.
 *
 * Layouts (data-layout on the track): "full" — one slide fills the track; "peek" — slides are narrower than the
 * track and snap to its centre, so a sliver of the neighbours shows. Navigation centres the target slide, which
 * also covers "full" (centred = aligned when the slide is as wide as the track). In peek, clicking a side slide
 * (inert, so it cannot take focus) moves to it.
 *
 * Accessibility:
 *   - The play/pause button is visible whenever something moves (autoplay or slide videos).
 *   - Autoplay pauses while the pointer is over the slideshow or focus is inside it, and while the tab is hidden.
 *   - With prefers-reduced-motion nothing starts on its own; pressing play is an explicit opt-in.
 *   - Slides that are not shown are inert, so keyboard focus never lands on a hidden slide.
 *   - Manual navigation is announced through a polite live region ("2 of 4").
 *   - A whole-slide link without a label takes the slide heading as its accessible name.
 * Slide videos (muted, looping) play only while their slide is shown, after page load, and never on Save-Data / 2G.
 *
 * Children: [data-ref=track] > [data-ref=slide][data-index][data-block-id], [data-ref=prev|next|toggle|status],
 * [data-ref=dot][data-index]. Attributes: data-autoplay, data-interval (seconds), data-label-play, data-label-pause,
 * data-status ("[index] of N").
 */
import { ThemeElement, define } from '@aw/component';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whether background media may start on its own (no reduced motion, no data saver, no 2G). */
function mayAutoplay() {
  if (reducedMotion()) return false;
  const connection = /** @type {any} */ (navigator).connection;
  return !connection?.saveData && !/(^|-)2g$/.test(connection?.effectiveType ?? '');
}

class Slideshow extends ThemeElement {
  mount() {
    this.track = /** @type {HTMLElement | null} */ (this.ref('track'));
    this.slides = /** @type {HTMLElement[]} */ (this.refs('slide'));
    this.dots = /** @type {HTMLButtonElement[]} */ (this.refs('dot'));
    this.index = 0;
    this.holds = new Set();
    this.nameSlideLinks();
    if (!this.track || !this.slides.length) return;

    // Moving content starts only when allowed; the shopper can always opt in with the play button.
    this.playing = mayAutoplay() && (this.hasAttribute('data-autoplay') || this.hasVideo());
    this.mediaAllowed = this.playing;

    const prev = this.ref('prev');
    const next = this.ref('next');
    const toggle = this.ref('toggle');
    if (prev) this.listen(prev, 'click', () => this.go(this.index - 1, true));
    if (next) this.listen(next, 'click', () => this.go(this.index + 1, true));
    if (toggle) this.listen(toggle, 'click', () => this.setPlaying(!this.playing));
    for (const dot of this.dots) this.listen(dot, 'click', () => this.go(Number(dot.dataset.index), true));

    // Peek layout: side slides are inert, so a click on them lands on the track; find the slide under the pointer.
    this.listen(this.track, 'click', (event) => {
      const { clientX, clientY } = /** @type {MouseEvent} */ (event);
      const index = this.slides.findIndex((slide) => {
        const rect = slide.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      });
      if (index >= 0 && index !== this.index && this.slides[index].inert) this.go(index, true);
    });

    this.listen(this, 'keydown', (event) => this.onKey(/** @type {KeyboardEvent} */ (event)));

    // Pause while the shopper interacts (hover with a mouse, keyboard focus inside), resume afterwards.
    this.listen(this, 'pointerenter', (event) => {
      if (/** @type {PointerEvent} */ (event).pointerType === 'mouse') this.hold('hover', true);
    });
    this.listen(this, 'pointerleave', () => this.hold('hover', false));
    this.listen(this, 'focusin', () => this.hold('focus', true));
    this.listen(this, 'focusout', (event) => {
      if (!this.contains(/** @type {Node | null} */ (/** @type {FocusEvent} */ (event).relatedTarget))) this.hold('focus', false);
    });
    this.listen(document, 'visibilitychange', () => this.hold('hidden', document.hidden));

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.setActive(this.slides.indexOf(/** @type {HTMLElement} */ (entry.target)));
        }
      },
      { root: this.track, threshold: 0.6 },
    );
    for (const slide of this.slides) this.observer.observe(slide);

    // Theme editor: selecting a slide block shows it and stops autoplay until it is deselected.
    this.listen(document, 'shopify:block:select', (event) => {
      const index = this.slides.findIndex((s) => s.dataset.blockId === /** @type {CustomEvent} */ (event).detail?.blockId);
      if (index < 0) return;
      this.hold('editor', true);
      this.go(index, false, 'auto');
    });
    this.listen(document, 'shopify:block:deselect', () => this.hold('editor', false));

    this.setActive(0);
    this.updateToggle();
    // Nothing moves or downloads video before the page has finished loading.
    const start = () => {
      this.ready = true;
      this.setActive(this.index);
      this.schedule();
    };
    if (document.readyState === 'complete') start();
    else this.listen(window, 'load', start, { once: true });
  }

  unmount() {
    this.observer?.disconnect();
    clearTimeout(this.timer);
  }

  hasVideo() {
    return this.slides?.some((slide) => slide.querySelector('video')) ?? false;
  }

  /** Whole-slide links without an explicit label are named after the slide heading. */
  nameSlideLinks() {
    for (const link of this.refs('slide-link')) {
      if (link.hasAttribute('aria-label')) continue;
      const slide = link.closest('[data-ref="slide"]');
      const heading = slide?.querySelector('h1, h2, h3, h4, h5, h6, p[class*="type-"]');
      const text = heading?.textContent?.trim();
      if (text) link.setAttribute('aria-label', text);
    }
  }

  /** @param {KeyboardEvent} event */
  onKey(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = /** @type {HTMLElement} */ (event.target);
    if (target.closest('input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    const forward = (event.key === 'ArrowRight') !== (document.dir === 'rtl');
    this.go(this.index + (forward ? 1 : -1), true);
    if (target.dataset.ref === 'dot') this.dots[this.index]?.focus();
  }

  /**
   * @param {number} index
   * @param {boolean} [announce] - announce the new slide (manual navigation)
   * @param {ScrollBehavior} [behavior]
   */
  go(index, announce = false, behavior) {
    const count = this.slides.length;
    if (!count || !this.track) return;
    const next = ((index % count) + count) % count;
    const slide = this.slides[next];
    // Centre the slide in the track (for full-width slides this is simply their start edge). Measured from the
    // rendered positions, so it works the same in left-to-right and right-to-left layouts.
    const slideRect = slide.getBoundingClientRect();
    const trackRect = this.track.getBoundingClientRect();
    const delta = slideRect.left + slideRect.width / 2 - (trackRect.left + trackRect.width / 2);
    this.track.scrollTo({ left: this.track.scrollLeft + delta, behavior: behavior ?? (reducedMotion() ? 'auto' : 'smooth') });
    this.setActive(next);
    if (announce) this.announce();
    this.schedule();
  }

  /** @param {number} index */
  setActive(index) {
    if (index < 0) return;
    this.index = index;
    this.slides.forEach((slide, i) => {
      const active = i === index;
      slide.inert = !active;
      const video = slide.querySelector('video');
      if (!video) return;
      if (active && this.ready && this.mediaAllowed && this.playing) video.play().catch(() => {});
      else video.pause();
    });
    this.dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  announce() {
    const status = this.ref('status');
    if (status) status.textContent = (this.dataset.status ?? '').replace('[index]', String(this.index + 1));
  }

  /** @param {boolean} playing */
  setPlaying(playing) {
    this.playing = playing;
    if (playing) this.mediaAllowed = true;
    this.updateToggle();
    this.setActive(this.index);
    this.schedule();
  }

  updateToggle() {
    const toggle = this.ref('toggle');
    if (!toggle) return;
    toggle.toggleAttribute('data-playing', Boolean(this.playing));
    const label = this.playing ? this.dataset.labelPause : this.dataset.labelPlay;
    if (label) toggle.setAttribute('aria-label', label);
  }

  /**
   * Temporarily hold autoplay for a reason (hover, focus, hidden tab, editor).
   * @param {string} reason
   * @param {boolean} on
   */
  hold(reason, on) {
    if (on) this.holds.add(reason);
    else this.holds.delete(reason);
    this.schedule();
  }

  /** (Re)start the autoplay timer when autoplay is on, playing and nothing holds it. */
  schedule() {
    clearTimeout(this.timer);
    if (!this.ready || !this.hasAttribute('data-autoplay') || !this.playing || this.holds.size || this.slides.length < 2) return;
    const seconds = Number(this.dataset.interval) || 6;
    this.timer = setTimeout(() => this.go(this.index + 1), seconds * 1000);
  }
}

define('aw-slideshow', Slideshow);
