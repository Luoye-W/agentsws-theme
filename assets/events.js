/**
 * Theme event names and a typed dispatch helper.
 *
 * Every custom event the theme emits is listed here and in docs/events.md.
 * Apps, agents and custom blocks should listen on `document` for these names
 * instead of reaching into component internals.
 */

/** @enum {string} */
export const ThemeEvents = Object.freeze({
  /** A section was re-rendered (theme editor or Section Rendering API). detail: { sectionId } */
  sectionRendered: 'aw:section:rendered',
  /** The cart changed (add, quantity change, removal, discount codes, attributes). detail: { itemCount, sections, source } */
  cartUpdated: 'aw:cart:updated',
  /** A cart request failed. detail: { message, source } */
  cartError: 'aw:cart:error',
  /** A product page switched variant. detail: { sectionId, variantId, mediaId } */
  variantChanged: 'aw:variant:changed',
  /** Collection or search results were re-rendered after filtering or sorting. detail: { sectionId, url } */
  facetsUpdated: 'aw:facets:updated',
  /** "Load more" / infinite scroll appended the next page to a product grid. detail: { sectionId, url, count } */
  resultsAppended: 'aw:results:appended',
  /** The visitor answered the cookie banner. detail: { analytics, marketing, preferences, sale_of_data } (booleans) */
  consentChanged: 'aw:consent:changed',
  /** The quick view window for a product was shown (product cards → "+"). detail: { url } */
  quickViewOpened: 'aw:quick-view:opened',
  /** A countdown reached its end date (the timer hid itself). detail: { id, end } — end is a timestamp in ms */
  countdownEnded: 'aw:countdown:ended',
});

/**
 * Dispatch a theme event on document (bubbling, composed).
 * @param {string} name - One of ThemeEvents.
 * @param {Record<string, unknown>} [detail]
 */
export function emit(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}
