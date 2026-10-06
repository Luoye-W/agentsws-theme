/**
 * <aw-marquee data-speed="40"> — endlessly scrolling row(s) of text or logos with a pause button.
 *
 * Markup (one or more rows):
 *   <aw-marquee data-speed="40">                        ← speed in pixels per second
 *     <div data-ref="row" data-direction="left|right" class="overflow-hidden">
 *       <div data-ref="track" dir="ltr" class="flex flex-wrap justify-center in-data-[state=running]:w-max in-data-[state=running]:flex-nowrap">
 *         <div data-ref="group" class="flex shrink-0 …">items</div>
 *       </div>
 *     </div>
 *     <button data-ref="toggle" data-label-pause="Pause" data-label-play="Play" hidden>
 *       <span data-ref="icon-pause">…</span><span data-ref="icon-play" hidden>…</span><span data-ref="toggle-label">Pause</span>
 *     </button>
 *   </aw-marquee>
 *
 * - Without JavaScript or with reduced motion the content stays still (wrapped, centered) and is not copied.
 * - Copies of the group fill the row; they are hidden from screen readers and made inert, so links inside
 *   the original stay the only keyboard stops.
 * - Speed is in pixels per second (Web Animations API), so it does not depend on the screen refresh rate.
 * - Pauses while hovered with a mouse, while something inside has focus, when scrolled out of view,
 *   and whenever the visitor presses the pause button (their choice sticks until they press play).
 */
import { ThemeElement, define } from '@aw/component';

class Marquee extends ThemeElement {
  mount() {
    /** @type {Animation[]} */
    this.animations = [];
    this.userPaused = false;
    this.hovered = false;
    this.focused = false;
    this.visible = true;
    this.measured = '';

    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.listen(this.motion, 'change', () => this.build());

    const toggle = this.ref('toggle');
    if (toggle) {
      this.listen(toggle, 'click', () => {
        this.userPaused = !this.userPaused;
        this.apply();
      });
    }

    this.listen(this, 'pointerenter', (event) => {
      if (/** @type {PointerEvent} */ (event).pointerType !== 'mouse') return;
      this.hovered = true;
      this.apply();
    });
    this.listen(this, 'pointerleave', () => {
      this.hovered = false;
      this.apply();
    });
    this.listen(this, 'focusin', (event) => {
      if (event.target === toggle) return;
      this.focused = true;
      this.apply();
    });
    this.listen(this, 'focusout', (event) => {
      const next = /** @type {Node | null} */ (/** @type {FocusEvent} */ (event).relatedTarget);
      if (next && this.contains(next) && next !== toggle) return;
      this.focused = false;
      this.apply();
    });

    this.intersection = new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      this.apply();
    });
    this.intersection.observe(this);

    // Rebuild when the available width or the content width changes (web fonts or images arriving late).
    this.resize = new ResizeObserver(() => {
      if (this.measure() !== this.measured) this.build();
    });
    this.resize.observe(this);
    for (const group of this.refs('group')) this.resize.observe(group);

    this.build();
  }

  unmount() {
    this.intersection?.disconnect();
    this.resize?.disconnect();
    this.teardown();
  }

  teardown() {
    for (const animation of this.animations) animation.cancel();
    this.animations = [];
    for (const clone of this.querySelectorAll('[data-clone]')) clone.remove();
    delete this.dataset.state;
  }

  /** Widths that decide the layout: the element and each original group. */
  measure() {
    return [this.clientWidth, ...this.refs('group').map((g) => Math.round(g.getBoundingClientRect().width))].join(',');
  }

  build() {
    this.teardown();
    const toggle = this.ref('toggle');
    if (this.motion?.matches) {
      if (toggle) toggle.hidden = true;
      this.measured = this.measure();
      return;
    }

    this.dataset.state = 'running';
    const speed = Math.max(Number(this.dataset.speed) || 40, 5);

    for (const row of this.refs('row')) {
      const track = row.querySelector('[data-ref="track"]');
      const group = row.querySelector('[data-ref="group"]');
      if (!track || !group) continue;
      const groupWidth = group.getBoundingClientRect().width;
      if (groupWidth < 1) continue;

      const copies = Math.ceil(row.clientWidth / groupWidth) + 1;
      for (let i = 0; i < copies; i += 1) {
        const clone = /** @type {HTMLElement} */ (group.cloneNode(true));
        clone.removeAttribute('data-ref');
        clone.setAttribute('data-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        for (const el of clone.querySelectorAll('[id], [data-shopify-editor-block]')) {
          el.removeAttribute('id');
          el.removeAttribute('data-shopify-editor-block');
        }
        track.append(clone);
      }

      const animation = track.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(${-groupWidth}px)` }],
        {
          duration: (groupWidth / speed) * 1000,
          iterations: Infinity,
          direction: /** @type {HTMLElement} */ (row).dataset.direction === 'right' ? 'reverse' : 'normal',
        },
      );
      this.animations.push(animation);
    }

    if (toggle) toggle.hidden = this.animations.length === 0;
    this.measured = this.measure();
    this.apply();
  }

  apply() {
    const run = !this.userPaused && !this.hovered && !this.focused && this.visible;
    for (const animation of this.animations) {
      if (run) animation.play();
      else animation.pause();
    }

    const toggle = this.ref('toggle');
    if (!toggle) return;
    const label = this.ref('toggle-label');
    if (label) label.textContent = (this.userPaused ? toggle.dataset.labelPlay : toggle.dataset.labelPause) ?? '';
    const pauseIcon = this.ref('icon-pause');
    const playIcon = this.ref('icon-play');
    if (pauseIcon) pauseIcon.hidden = this.userPaused;
    if (playIcon) playIcon.hidden = !this.userPaused;
  }
}

define('aw-marquee', Marquee);
