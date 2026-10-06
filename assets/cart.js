/**
 * Cart requests shared by the product form and cart items (import as `@aw/cart`).
 * Every request asks Shopify to render the cart sections on the page in the same round trip
 * (Section Rendering API), then announces the result with `aw:cart:updated`.
 */
import { emit, ThemeEvents } from '@aw/events';

/** Section ids of every `<aw-cart-items>` on the page (cart drawer, cart page). */
export function cartSectionIds() {
  return [...new Set([...document.querySelectorAll('aw-cart-items[data-section]')].map((el) => el.getAttribute('data-section')))];
}

/**
 * Add the variant in a product form to the cart.
 * @param {string} url - routes.cart_add_url
 * @param {FormData} formData
 * @returns {Promise<boolean>} true when added
 */
export async function addToCart(url, formData) {
  const sections = cartSectionIds();
  formData.set('sections', sections.join(','));
  formData.set('sections_url', window.location.pathname);
  const json = await request(`${url}.js`, { method: 'POST', body: formData }, 'add');
  if (!json) return false;
  announce(json.sections ?? {}, 'add');
  return true;
}

/**
 * Add several variants in one request (add-ons, bundles).
 * @param {string} url - routes.cart_add_url
 * @param {{ id: number | string, quantity: number }[]} items
 * @returns {Promise<boolean>} true when all were added
 */
export async function addItems(url, items) {
  const body = JSON.stringify({ items, sections: cartSectionIds(), sections_url: window.location.pathname });
  const json = await request(`${url}.js`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }, 'add');
  if (!json) return false;
  announce(json.sections ?? {}, 'add');
  return true;
}

/**
 * Change the quantity of a cart line (0 removes it).
 * @param {string} url - routes.cart_change_url
 * @param {number} line - 1-based line index
 * @param {number} quantity
 * @returns {Promise<boolean>}
 */
export async function changeLine(url, line, quantity) {
  const body = JSON.stringify({ line, quantity, sections: cartSectionIds(), sections_url: window.location.pathname });
  const json = await request(`${url}.js`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }, 'change');
  if (!json) return false;
  announce(json.sections ?? {}, 'change', json.item_count);
  return true;
}

/**
 * Update cart-level data (discount codes, attributes, note) and re-render the cart sections.
 * @param {string} url - routes.cart_update_url
 * @param {Record<string, unknown>} data - e.g. { discount: 'CODE1,CODE2' } or { attributes: { 'Gift message': '…' } }
 * @returns {Promise<any>} The cart (including discount_codes with their `applicable` flag), or null when the request failed
 */
export async function updateCart(url, data) {
  const body = JSON.stringify({ ...data, sections: cartSectionIds(), sections_url: window.location.pathname });
  const json = await request(`${url}.js`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }, 'update');
  if (!json) return null;
  announce(json.sections ?? {}, 'update', json.item_count);
  return json;
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {string} source
 */
async function request(url, init, source) {
  try {
    const response = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(init.headers ?? {}) } });
    const json = await response.json();
    if (!response.ok || json.status) {
      emit(ThemeEvents.cartError, { message: json.description || json.message || '', source });
      return null;
    }
    return json;
  } catch (error) {
    emit(ThemeEvents.cartError, { message: '', source });
    return null;
  }
}

/**
 * @param {Record<string, string>} sections
 * @param {string} source
 * @param {number} [itemCount]
 */
function announce(sections, source, itemCount) {
  let count = itemCount;
  if (count === undefined) {
    const html = Object.values(sections)[0];
    const match = html?.match(/data-item-count="(\d+)"/);
    count = match ? Number(match[1]) : undefined;
  }
  if (count !== undefined) {
    for (const el of document.querySelectorAll('[data-cart-count]')) {
      el.textContent = String(count);
      el.toggleAttribute('hidden', count === 0);
    }
  }
  emit(ThemeEvents.cartUpdated, { itemCount: count, sections, source });
}

/**
 * Format cents with the shop's money format (shop.money_format, passed to scripts in a data attribute).
 * @param {number} cents
 * @param {string} format - e.g. "${{amount}}", "{{amount_with_comma_separator}} €"
 * @returns {string}
 */
export function formatMoney(cents, format) {
  const value = cents / 100;
  /**
   * @param {number} decimals
   * @param {string} thousands
   * @param {string} decimal
   */
  const number = (decimals, thousands = ',', decimal = '.') => {
    const [whole, fraction] = value.toFixed(decimals).split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return fraction ? `${grouped}${decimal}${fraction}` : grouped;
  };
  return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
    switch (key) {
      case 'amount_no_decimals': return number(0);
      case 'amount_with_comma_separator': return number(2, '.', ',');
      case 'amount_no_decimals_with_comma_separator': return number(0, '.', ',');
      case 'amount_with_apostrophe_separator': return number(2, "'", '.');
      case 'amount_no_decimals_with_space_separator': return number(0, ' ');
      case 'amount_with_space_separator': return number(2, ' ', ',');
      case 'amount_with_period_and_space_separator': return number(2, ' ', '.');
      default: return number(2);
    }
  });
}
