/**
 * <aw-recently-viewed> — products this shopper viewed on this device (localStorage, never sent anywhere).
 *
 * Two modes:
 * - <aw-recently-viewed data-record="handle" hidden> (main product section): records the product — de-duplicated,
 *   newest first, at most 12 handles.
 * - <aw-recently-viewed data-url="/products/[handle]?section_id=product-card-fragment" data-limit data-exclude>
 *   (sections/recently-viewed): once near the viewport, fetches one product card per stored handle through the
 *   Section Rendering API (in parallel, kept in stored order) and reveals itself when at least one card loaded.
 *   Handles that no longer resolve (deleted / unpublished products) are dropped from storage.
 *   The fragment card carries every optional part; data-quick-add, data-highlights and data-rating-chip decide
 *   which of them stay (quick add button, spec icons row, rating chip instead of the star row).
 */
import { ThemeElement, define } from '@aw/component';

const KEY = 'aw:recently-viewed';
const MAX = 12;

/** @returns {string[]} Stored handles, newest first. */
export function readRecentlyViewed() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((h) => typeof h === 'string' && h) : [];
  } catch {
    return [];
  }
}

/** @param {string[]} handles */
function write(handles) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(handles.slice(0, MAX)));
  } catch {
    // Storage blocked (private mode): the section simply stays hidden.
  }
}

/**
 * Move a product handle to the front of the list.
 * @param {string} handle
 */
export function recordRecentlyViewed(handle) {
  write([handle, ...readRecentlyViewed().filter((h) => h !== handle)]);
}

class RecentlyViewed extends ThemeElement {
  mount() {
    if (this.dataset.record) {
      recordRecentlyViewed(this.dataset.record);
      return;
    }
    if (!this.dataset.url || this.dataset.loaded) return;
    this.observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      this.observer?.disconnect();
      this.load();
    }, { rootMargin: '0px 0px 400px 0px' });
    this.observer.observe(this.closest('.shopify-section') ?? this);
  }

  unmount() {
    this.observer?.disconnect();
  }

  async load() {
    this.dataset.loaded = 'true';
    const limit = Number(this.dataset.limit) || 4;
    const handles = readRecentlyViewed().filter((h) => h !== this.dataset.exclude).slice(0, limit);
    const list = this.ref('list');
    if (!handles.length || !list) return;

    const pages = await Promise.all(handles.map(async (handle) => {
      try {
        const response = await fetch((this.dataset.url ?? '').replace('[handle]', encodeURIComponent(handle)));
        return response.ok ? await response.text() : null;
      } catch {
        return undefined; // Network problem: keep the handle for next time.
      }
    }));

    const gone = handles.filter((_, i) => pages[i] === null);
    if (gone.length) write(readRecentlyViewed().filter((h) => !gone.includes(h)));

    for (const html of pages) {
      if (!html) continue;
      const card = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-product-card-fragment]');
      if (!card) continue;
      if (!this.hasAttribute('data-quick-add')) for (const button of card.querySelectorAll('aw-quick-add')) button.remove();
      if (!this.hasAttribute('data-highlights')) for (const row of card.querySelectorAll('[data-card-highlights]')) row.remove();
      const unusedRating = this.hasAttribute('data-rating-chip') ? '[data-card-rating]' : '[data-card-rating-chip]';
      for (const rating of card.querySelectorAll(unusedRating)) rating.remove();
      const item = document.createElement('li');
      item.className = this.dataset.itemClass ?? '';
      item.append(...[...card.childNodes].map((node) => document.importNode(node, true)));
      list.append(item);
    }
    if (list.children.length) this.hidden = false;
  }
}

define('aw-recently-viewed', RecentlyViewed);
