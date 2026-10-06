/**
 * <aw-product-comparison data-highlight="true|false"> — the "Highlight differences" switch (data-ref="toggle").
 * Which rows differ is decided in Liquid (rows carry the highlight classes); this only flips data-highlight,
 * which those classes react to (Tailwind in-data-[highlight=true]: variant).
 */
import { ThemeElement, define } from '@aw/component';

class ProductComparison extends ThemeElement {
  mount() {
    const toggle = /** @type {HTMLInputElement | null} */ (this.ref('toggle'));
    if (!toggle) return;
    this.dataset.highlight = String(toggle.checked);
    this.listen(toggle, 'change', () => {
      this.dataset.highlight = String(toggle.checked);
    });
  }
}

define('aw-product-comparison', ProductComparison);
