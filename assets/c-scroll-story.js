/**
 * <aw-scroll-story> — sticky media with text steps scrolling past (sections/scroll-story.liquid).
 *
 * Only on large screens (≥ 990px) without reduced motion: sets data-animate (the CSS then shows the sticky stage and
 * hides the inline step images) and watches which step (data-ref="step") crosses the middle of the viewport.
 * The current step gets data-active; image layers (data-ref="layer", data-step = step index) of that step and earlier
 * steps get data-shown (wipe-in in CSS); progress segments (data-ref="segment") up to the step get data-active.
 * Everywhere else the section stays a plain stacked layout.
 */
import { ThemeElement, define } from '@aw/component';

class ScrollStory extends ThemeElement {
  mount() {
    this.steps = /** @type {HTMLElement[]} */ (this.refs('step'));
    this.layers = /** @type {HTMLElement[]} */ (this.refs('layer'));
    this.segments = /** @type {HTMLElement[]} */ (this.refs('segment'));
    if (this.steps.length === 0) return;

    this.large = window.matchMedia('(min-width: 990px)');
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => this.toggle();
    this.listen(this.large, 'change', update);
    this.listen(this.reduce, 'change', update);
    this.toggle();
  }

  unmount() {
    this.observer?.disconnect();
  }

  toggle() {
    const on = Boolean(this.large?.matches) && !this.reduce?.matches;
    this.toggleAttribute('data-animate', on);
    this.observer?.disconnect();
    this.observer = undefined;
    if (!on) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.activate((this.steps ?? []).indexOf(/** @type {HTMLElement} */ (entry.target)));
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    for (const step of this.steps ?? []) this.observer.observe(step);
    this.activate(this.index ?? 0);
  }

  /** @param {number} index */
  activate(index) {
    if (index < 0) return;
    this.index = index;
    (this.steps ?? []).forEach((step, i) => step.toggleAttribute('data-active', i === index));
    (this.segments ?? []).forEach((segment, i) => segment.toggleAttribute('data-active', i <= index));
    for (const layer of this.layers ?? []) layer.toggleAttribute('data-shown', Number(layer.dataset.step) <= index);
  }
}

define('aw-scroll-story', ScrollStory);
