# Compose page content from existing blocks (L2)

Use the core **container** section and existing blocks (`heading`, `text`, `button`, `image`, `group`, `spacer`, app blocks, any `custom-` blocks). Check `CATALOG.index.json` for everything available (full settings per entry in `CATALOG.json`).

## Homepage or existing page

Edit `templates/index.json` (or the page's template). A container with a two-column layout:

```json
"promo": {
  "type": "container",
  "settings": { "direction": "row", "align": "center", "gap": 32, "color_scheme": "scheme-2" },
  "blocks": {
    "copy": {
      "type": "group",
      "settings": { "width": "half" },
      "blocks": {
        "title": { "type": "heading", "settings": { "text": "Summer sale", "size": "h2" } },
        "body": { "type": "text", "settings": { "text": "<p>Up to 30% off.</p>" } },
        "cta": { "type": "button", "settings": { "label": "Shop the sale", "link": "shopify://collections/sale" } }
      },
      "block_order": ["title", "body", "cta"]
    },
    "photo": { "type": "image", "settings": { "aspect": "landscape" } }
  },
  "block_order": ["copy", "photo"]
}
```

Add the key to the template's `"order"` array where it should appear.

- Images chosen in JSON must be uploaded in Shopify admin first (`"image": "shopify://shop_images/<file>"`), otherwise leave them blank and ask the operator to pick one in the editor.
- Links use `shopify://` references (`shopify://collections/<handle>`, `shopify://products/<handle>`, `shopify://pages/<handle>`).

## New landing page

1. Create `templates/page.<name>.json` (e.g. `page.black-friday.json`) with a `main-page` section and one or more containers.
2. Tell the operator: *Online Store → Pages → create page → Theme template → `<name>`*.
3. Add `{ "name": "<name>", "path": "/pages/<handle>" }` to `tests/pages.json` if the page exists, then `npm run verify:preview`.
