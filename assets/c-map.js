/**
 * <aw-map> — Google Maps embed that loads only after the visitor asks for it (privacy / consent friendly).
 *
 * Markup (see snippets/map-embed.liquid):
 *   <aw-map>
 *     <template data-ref="template"><iframe …></iframe></template>   ← the map, not loaded yet
 *     <div data-ref="poster">…fallback image… <button data-ref="load">Show map</button></div>
 *   </aw-map>
 *
 * - Clicking the button replaces the poster with the iframe and moves focus to it.
 * - Maps that load immediately need no script; this element is only used for "load on click".
 */
import { ThemeElement, define } from '@aw/component';

class MapEmbed extends ThemeElement {
  mount() {
    const button = this.ref('load');
    if (button) this.listen(button, 'click', () => this.load());
  }

  load() {
    const template = /** @type {HTMLTemplateElement | null} */ (this.ref('template'));
    if (!template) return;
    const frame = /** @type {DocumentFragment} */ (template.content.cloneNode(true));
    const iframe = frame.querySelector('iframe');
    template.replaceWith(frame);
    this.ref('poster')?.remove();
    iframe?.setAttribute('tabindex', '0');
    iframe?.focus({ preventScroll: true });
  }
}

define('aw-map', MapEmbed);
