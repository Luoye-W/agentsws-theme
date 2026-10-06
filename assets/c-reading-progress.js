/**
 * <aw-reading-progress data-target="ElementId"> — thin bar at the top of the window that fills as the visitor
 * scrolls through the target element (a blog post). Decorative: the bar is aria-hidden; it moves only with
 * scrolling, so it needs no pause control.
 *
 * Markup:
 *   <aw-reading-progress data-target="…" aria-hidden="true"><span data-ref="bar"></span></aw-reading-progress>
 */
import { ThemeElement, define } from '@aw/component';

class ReadingProgress extends ThemeElement {
  mount() {
    const target = document.getElementById(this.dataset.target ?? '');
    const bar = this.ref('bar');
    if (!target || !bar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : rect.top < 0 ? 1 : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    this.listen(window, 'scroll', schedule, { passive: true });
    this.listen(window, 'resize', schedule, { passive: true });
    update();
  }
}

define('aw-reading-progress', ReadingProgress);
