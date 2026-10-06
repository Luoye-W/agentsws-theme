/**
 * <aw-account-addresses> — country → province lists for every address form inside it.
 *
 * Each country <select data-country-select data-default="Canada" data-province-target="<province select id>"> holds
 * Shopify's country option tags, whose data-provinces attribute is a JSON list of [value, label] pairs. The province
 * <select data-default="Ontario"> is filled from it and its wrapper [data-province-wrapper="<id>"] is hidden when the
 * country has no provinces. Saved values are selected on load.
 */
import { ThemeElement, define } from '@aw/component';

class AccountAddresses extends ThemeElement {
  mount() {
    for (const select of this.querySelectorAll('select[data-country-select]')) {
      const country = /** @type {HTMLSelectElement} */ (select);
      const saved = country.dataset.default;
      if (saved) country.value = saved;
      this.fillProvinces(country, true);
      this.listen(country, 'change', () => this.fillProvinces(country, false));
    }
  }

  /**
   * @param {HTMLSelectElement} country
   * @param {boolean} keepSaved - Select the saved province (first load)
   */
  fillProvinces(country, keepSaved) {
    const targetId = country.dataset.provinceTarget ?? '';
    const province = /** @type {HTMLSelectElement | null} */ (document.getElementById(targetId));
    const wrapper = /** @type {HTMLElement | null} */ (this.querySelector(`[data-province-wrapper="${CSS.escape(targetId)}"]`));
    if (!province) return;

    /** @type {[string, string][]} */
    let provinces = [];
    try {
      provinces = JSON.parse(country.selectedOptions[0]?.dataset.provinces || '[]');
    } catch {
      provinces = [];
    }

    province.replaceChildren(...provinces.map(([value, label]) => new Option(label, value)));
    if (keepSaved && province.dataset.default) province.value = province.dataset.default;
    province.disabled = provinces.length === 0;
    if (wrapper) wrapper.hidden = provinces.length === 0;
  }
}

define('aw-account-addresses', AccountAddresses);
