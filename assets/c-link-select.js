/**
 * <aw-link-select> — a native <select> whose option values are URLs: choosing an option opens that page.
 * Used where a row of links becomes a dropdown on small screens (blog tag filter). Keep a real list of links
 * elsewhere on the page (or in <noscript>) so the choice also works without JavaScript.
 *
 * Markup:
 *   <aw-link-select><label …>…</label><select data-ref="select"><option value="/blogs/news" selected>…</option>…</select></aw-link-select>
 */
import { ThemeElement, define } from '@aw/component';

class LinkSelect extends ThemeElement {
  mount() {
    const select = /** @type {HTMLSelectElement | null} */ (this.ref('select'));
    if (!select) return;
    this.listen(select, 'change', () => {
      const url = select.value;
      if (url && url !== window.location.pathname) window.location.assign(url);
    });
  }
}

define('aw-link-select', LinkSelect);
