/**
 * <aw-localization> — submits the Shopify localization form as soon as a country or language is chosen.
 * Without JavaScript a submit button is shown instead.
 */
import { ThemeElement, define } from '@aw/component';

class Localization extends ThemeElement {
  mount() {
    this.listen(this, 'change', (event) => {
      const select = /** @type {HTMLElement} */ (event.target);
      if (select.tagName === 'SELECT') select.closest('form')?.submit();
    });
  }
}

define('aw-localization', Localization);
