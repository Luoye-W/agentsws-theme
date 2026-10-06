/**
 * <aw-recommendations data-url [hidden] [data-strip-quick-add]> — fetches a section with Shopify product
 * recommendations once it comes near the viewport, then inserts the result. Stays empty (or hidden) when there is
 * nothing to recommend.
 *
 * - Without a data-ref="results" child (sections/product-recommendations) the whole content is replaced; content
 *   that is already there means the section was rendered by the recommendations endpoint itself.
 * - With data-ref="results" (blocks/product-complementary) only that child is filled, the heading stays, and the
 *   `hidden` attribute is removed once there are results.
 * - data-strip-quick-add removes quick add buttons from the inserted cards (the fetched section renders them).
 */
import { ThemeElement, define } from '@aw/component';

class Recommendations extends ThemeElement {
  mount() {
    if (!this.dataset.url || this.dataset.loaded) return;
    if (!this.ref('results') && this.childElementCount > 0) return;
    this.observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      this.observer?.disconnect();
      this.load();
    }, { rootMargin: '0px 0px 400px 0px' });
    // A hidden element never intersects: watch its parent instead.
    this.observer.observe(this.hidden && this.parentElement ? this.parentElement : this);
  }

  unmount() {
    this.observer?.disconnect();
  }

  async load() {
    this.dataset.loaded = 'true';
    try {
      const response = await fetch(this.dataset.url ?? '');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = doc.querySelector('aw-recommendations');
      if (!next || !next.innerHTML.trim()) return;
      const target = this.ref('results') ?? this;
      target.innerHTML = next.innerHTML;
      if (this.hasAttribute('data-strip-quick-add')) {
        for (const button of target.querySelectorAll('aw-quick-add')) button.remove();
      }
      this.hidden = false;
    } catch {
      // Recommendations are optional; leave the section empty.
    }
  }
}

define('aw-recommendations', Recommendations);
