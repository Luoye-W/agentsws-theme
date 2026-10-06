/**
 * <aw-shipping-estimator data-default-country data-money-format data-found-one data-found-other data-none data-error>
 * Shipping rate estimate on the cart page: country (with provinces when the country has them) and postal code,
 * then Shopify's cart shipping-rate endpoints (prepare, then poll the async result). Results are written as text
 * into a live region, so screen readers announce them.
 *
 * Markup (fields have no name, so they are never submitted with the cart form):
 *   <select data-ref="country">{{ country_option_tags }}</select>   ← options carry data-provinces='[["CODE","Name"],…]'
 *   <div data-ref="province-field" hidden><select data-ref="province"></select></div>
 *   <input data-ref="zip">  <button type="button" data-ref="submit">  <div data-ref="result" role="status"></div>
 */
import { ThemeElement, define } from '@aw/component';
import { formatMoney } from '@aw/cart';

class ShippingEstimator extends ThemeElement {
  mount() {
    const country = /** @type {HTMLSelectElement | null} */ (this.ref('country'));
    if (!country) return;
    const preferred = this.dataset.defaultCountry ?? '';
    const match = [...country.options].find((o) => o.value === preferred || o.textContent?.trim() === preferred);
    if (match) country.value = match.value;
    this.fillProvinces();
    this.listen(country, 'change', () => this.fillProvinces());
    const submit = this.ref('submit');
    if (submit) this.listen(submit, 'click', () => this.estimate());
    const zip = this.ref('zip');
    if (zip) {
      this.listen(zip, 'keydown', (event) => {
        if (/** @type {KeyboardEvent} */ (event).key !== 'Enter') return;
        event.preventDefault();
        this.estimate();
      });
    }
  }

  fillProvinces() {
    const country = /** @type {HTMLSelectElement} */ (this.ref('country'));
    const province = /** @type {HTMLSelectElement | null} */ (this.ref('province'));
    const field = this.ref('province-field');
    if (!province || !field) return;
    /** @type {[string, string][]} */
    let provinces = [];
    try {
      provinces = JSON.parse(country.selectedOptions[0]?.dataset.provinces || '[]');
    } catch {
      provinces = [];
    }
    province.replaceChildren(...provinces.map(([code, name]) => new Option(name, code)));
    field.hidden = provinces.length === 0;
  }

  async estimate() {
    const country = /** @type {HTMLSelectElement} */ (this.ref('country'));
    const province = /** @type {HTMLSelectElement | null} */ (this.ref('province'));
    const zip = /** @type {HTMLInputElement | null} */ (this.ref('zip'));
    const submit = /** @type {HTMLButtonElement | null} */ (this.ref('submit'));
    const params = new URLSearchParams({
      'shipping_address[country]': country.value,
      'shipping_address[province]': province && !this.ref('province-field')?.hidden ? province.value : '',
      'shipping_address[zip]': zip?.value.trim() ?? '',
    });
    const root = /** @type {any} */ (window).Shopify?.routes?.root ?? '/';
    submit?.setAttribute('aria-busy', 'true');
    if (submit) submit.disabled = true;
    try {
      const prepare = await fetch(`${root}cart/prepare_shipping_rates.json?${params}`, { method: 'POST', headers: { Accept: 'application/json' } });
      if (!prepare.ok) return this.showError(await prepare.json().catch(() => null));
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await fetch(`${root}cart/async_shipping_rates.json?${params}`, { headers: { Accept: 'application/json' } });
        if (!response.ok) return this.showError(await response.json().catch(() => null));
        const json = await response.json().catch(() => null);
        if (json && Array.isArray(json.shipping_rates)) return this.showRates(json.shipping_rates);
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      this.showError(null);
    } catch {
      this.showError(null);
    } finally {
      submit?.removeAttribute('aria-busy');
      if (submit) submit.disabled = false;
    }
  }

  /** @param {{ name: string, price: string }[]} rates */
  showRates(rates) {
    const result = this.ref('result');
    if (!result) return;
    result.replaceChildren();
    if (rates.length === 0) {
      result.append(this.line(this.dataset.none ?? '', 'text-error'));
      return;
    }
    const intro = rates.length === 1 ? this.dataset.foundOne : this.dataset.foundOther;
    result.append(this.line(intro ?? '', 'text-success'));
    const list = document.createElement('ul');
    list.className = 'mt-2 flex flex-col gap-1';
    for (const rate of rates) {
      const cents = Math.round(Number.parseFloat(rate.price) * 100);
      const item = document.createElement('li');
      item.className = 'flex justify-between gap-4 type-sm';
      const name = document.createElement('span');
      name.textContent = rate.name;
      const price = document.createElement('span');
      price.className = 'font-semibold';
      price.textContent = formatMoney(cents, this.dataset.moneyFormat || '{{amount}}');
      item.append(name, price);
      list.append(item);
    }
    result.append(list);
  }

  /** @param {Record<string, string[] | string> | null} errors */
  showError(errors) {
    const result = this.ref('result');
    if (!result) return;
    result.replaceChildren(this.line(this.dataset.error ?? '', 'text-error'));
    if (errors && typeof errors === 'object') {
      for (const [field, messages] of Object.entries(errors)) {
        const text = Array.isArray(messages) ? messages.join(', ') : String(messages);
        result.append(this.line(`${field}: ${text}`, 'text-error'));
      }
    }
  }

  /**
   * @param {string} text
   * @param {string} tone - class for the text colour
   */
  line(text, tone) {
    const p = document.createElement('p');
    p.className = `type-sm ${tone}`;
    p.textContent = text;
    return p;
  }
}

define('aw-shipping-estimator', ShippingEstimator);
