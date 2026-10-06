/**
 * <aw-product-countdown data-end="unix seconds"> — ticks the days / hours / minutes / seconds boxes
 * (data-ref="days|hours|minutes|seconds") once a second while near the viewport, and hides itself at zero.
 * The end date comes from a product metafield; the Liquid block never renders a countdown without one.
 */
import { ThemeElement, define } from '@aw/component';

class ProductCountdown extends ThemeElement {
  /** @type {number | undefined} */
  timer;

  mount() {
    this.end = Number(this.dataset.end) * 1000;
    if (!this.end) return;
    this.tick();
    this.observer = new IntersectionObserver(([entry]) => {
      window.clearInterval(this.timer);
      if (entry.isIntersecting) this.timer = window.setInterval(() => this.tick(), 1000);
    }, { rootMargin: '200px' });
    this.observer.observe(this);
  }

  unmount() {
    window.clearInterval(this.timer);
    this.observer?.disconnect();
  }

  tick() {
    const left = Math.max(0, Math.floor(((this.end ?? 0) - Date.now()) / 1000));
    if (left === 0) {
      this.hidden = true;
      this.unmount();
      return;
    }
    const parts = {
      days: Math.floor(left / 86400),
      hours: Math.floor((left % 86400) / 3600),
      minutes: Math.floor((left % 3600) / 60),
      seconds: left % 60,
    };
    for (const [name, value] of Object.entries(parts)) {
      const box = this.ref(name);
      if (box) box.textContent = String(value).padStart(2, '0');
    }
  }
}

define('aw-product-countdown', ProductCountdown);
