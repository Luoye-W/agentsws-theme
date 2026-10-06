# Theme events

Listen on `document`. Names and payloads are defined in `assets/events.js`.

| Event | When | `detail` |
|---|---|---|
| `aw:section:rendered` | A section was re-rendered in the theme editor | `{ sectionId }` |
| `aw:cart:updated` | Cart changed (add, quantity, remove, discount codes or attributes) — also after quick add, add-ons and comparison-table adds | `{ itemCount, sections, source }` — `sections` holds re-rendered cart section HTML by id |
| `aw:cart:error` | A cart request failed | `{ message, source }` (`source`: `add`, `change` or `update` — discount codes, gift wrap, cart attributes) |
| `aw:variant:changed` | Product section (main product or quick view) switched variant; the gallery, sticky add-to-cart bar and add-ons block follow it | `{ sectionId, variantId, mediaId }` |
| `aw:facets:updated` | Collection / search results re-rendered after filter, sort or page change | `{ sectionId, url }` |
| `aw:results:appended` | "Load more" or infinite scroll added the next page of products to a collection / search grid (the address bar does not change) | `{ sectionId, url, count }` — `url` is the fetched page, `count` the number of grid items added |
| `aw:consent:changed` | The visitor answered the theme's cookie banner (also sent to Shopify's Customer Privacy API) | `{ analytics, marketing, preferences, sale_of_data }` (booleans) |
| `aw:quick-view:opened` | The quick view window (`sections/product-quick-view`) was loaded and shown from a product card | `{ url }` — the section URL that was fetched |
| `aw:countdown:ended` | A countdown timer reached its end date and hid itself | `{ id, end }` (`end`: timestamp in ms) |

Component events (bubble from the element, not global): `modal:close` from `<aw-modal>` with `{ reason }`
(`dismiss`, `confirm`, `editor`, …), used by `<aw-popup>` to remember a visitor's answer.

Shopify's own editor events (`shopify:section:load`, `shopify:block:select`, …) and standard storefront events
(`shopify:cart:*`, `shopify:product:*`) are also available. 
