# Changelog

## Unreleased

- **Fix: sections that read their child blocks' settings.** For theme blocks, Liquid's `section.blocks` only has `id` and
  `type` (`"@theme"`), so these silently read nothing. Converted to section-local blocks (settings kept, template/preset
  `type` values renamed): `lookbook` `_hotspot` → `hotspot` (product list works again), `featured-collections-tabs`
  `_collection-tab` → `tab` (tabs show their collection), `header` `_mega-menu` → `mega_menu` (promos appear), `faq`
  `_faq-item`/`_faq-group` → `item`/`group` (FAQ structured data), `timeline` `_timeline-item` → `item` (jump labels).
  **Store repos:** in templates and section groups, rename those block `type` values; block settings are unchanged.
- `testimonials`, `main-article`, `slideshow` keep theme blocks and instead check the rendered blocks for a marker
  (`data-testimonial`, `data-share-block`, the slide video) — testimonials no longer stay hidden with real quotes; the
  "Adapt to image" slideshow height comes from the first slide itself.
- Lint rule `theme-block-settings` flags reading `.settings` / `.type` of theme blocks through `section.blocks`.

## 0.8.0 — batches 5–8: feature parity with the reference spec (built clean-room from a functional spec)

- **Chrome (5):** header layouts (logo left/center, menu left/center/split/drawer), sticky modes incl. hide-on-scroll, transparent
  header over a hero, hover/click dropdowns, mega-menu promos (`_mega-menu`), accordion or sliding mobile menu; announcement bar
  with multiple messages (rotate with pause / marquee); `mobile-dock`; search drawer + predictive search (Search settings);
  cart drawer: per-currency free-shipping bar, note, terms checkbox, recommendations, empty-state collections; footer social,
  logo and email-signup blocks, mobile accordion menus; `share` block. Header settings `menu_position`/`sticky` became
  `layout`/`sticky_mode`; announcement text became `_announcement` blocks.
- **Product (6):** gallery layouts, thumbnails left/below, own lightbox zoom, variant-only media via alt tags, sticky add-to-cart;
  blocks `product-inventory`, `-sku`, `-rating`, `-badges`, `-countdown` (metafield date), `-icon-list`, `-trust`, `-popup`,
  `-pickup`, `-complementary`, `-addons`; card quick add + quick view; `product-comparison` (aligned rows, no shifting cells),
  `recently-viewed`.
- **Media (7a):** `slideshow`, `video` (deferred, Save-Data aware, always pausable), `image-comparison` (range input),
  `collage`, `lookbook` (hotspots), `scrolling-images`, `reveal-image-with-text`; `highlight-text` styles for headings.
- **Content (7b):** `rich-text`, `multicolumn`, `faq` (opt-in structured data), `testimonials` (hidden until real quotes exist),
  `logo-list`, `timeline`, `stats`, `marquee`, `countdown` (real date required), `collection-list`,
  `featured-collections-tabs` (ARIA tabs), `contact-form` (custom fields); blocks `icon`, `divider`, `video`, `countdown`.
- **Pages (8):** blog, article, blog posts, list collections, About and Contact templates, customer account templates,
  `gift_card.liquid`, password page, 404 search; `overlay-group` with `newsletter-popup`, `age-verification`
  (Esc never confirms), `cookie-banner` (Customer Privacy API, never blocks scrolling).
- `verify` now catches Theme Check errors reported as `"error"` strings.

## 0.4.0 — batch 4: theme settings parity (and beyond)

- **Color schemes** (Shopify `color_scheme_group`, gradient backgrounds) replace the single palette; every section/group picks a
  `color_scheme`; page and drawer schemes are global settings. Store repos: run `node scripts/migrate-color-schemes.mjs` once.
- Global settings now cover: logo / inverse logo / mobile logo / widths / max height / favicon; status colors (sale, badge, rating,
  focus, overlay, placeholder, shadow); typography per role (headings, body, navigation, buttons, product cards: font, weight,
  size, line height, letter spacing, all caps) with optional self-hosted font files; layout (page width, margins, section spacing,
  grid gaps, radius for cards / media / inputs / buttons, swatch shape); buttons (border, cut corner, hover effect, hard shadow);
  inputs; product cards (style, alignment, vendor, rating, title lines, swatch limit, sale badge style, sold-out and automatic
  "New" badges); swatch name → colour map; animations (scroll reveal, image fade, native page transitions); currency codes;
  cart icon; social links and share channels; hover prefetch via Speculation Rules.
- `npm run settings` — list / get / set theme settings and section/block settings in templates with schema validation and WCAG
  contrast checks. `CATALOG.json` gains `theme_settings`.
- New snippets: `rating`. Utilities: `field`, `grid-gap`, `type-nav`, `type-card`, `rounded-media|input|swatch`.

## 0.3.0 — batch 3: home page sections

- `hero`, `image-with-text`, `image-cards` (+ `_image-card`), `features` (+ `_feature`), `newsletter`, `announcement-bar`;
  blocks `menu`, `localization`; footer payment icons and legal notice.

## 0.2.0 — batch 2: commerce

- Header: main menu with dropdowns and a wide panel for three-level menus, mobile menu drawer, search, account, cart count, sticky option
- Product page: `main-product` section with gallery (swipe, arrows, thumbnails, video/3D) and blocks `product-title`, `product-price`,
  `product-variant-picker` (swatches or buttons/dropdown, in-place variant switching), `product-buy-buttons` (quantity, add to cart,
  accelerated checkout), `product-description`, `product-specs` (spec table from a multi-line text metafield), `collapsible`
- `product-recommendations`, `featured-collection` sections
- Collection and search pages with Storefront filters (sidebar / mobile drawer), sorting, active filter chips, pagination — updated in place
- Cart drawer and cart page sharing one line-item snippet; AJAX add / change / remove via `@aw/cart`
- Snippets: `icon`, `price`, `swatch`, `swatch-option`, `product-card`, `product-gallery`, `facets`, `results-grid`, `pagination`, `cart-lines`
- Theme settings: Product cards (image shape, fit, hover image, swatches), Cart (drawer or page)
- Events: `aw:cart:updated`, `aw:cart:error`, `aw:variant:changed`, `aw:facets:updated`

## 0.1.0 — batch 1: foundation

- Theme settings: color palette, typography, layout, buttons; tokens as CSS variables (`snippets/theme-tokens.liquid`)
- Tailwind CSS v4 build with color surfaces, type presets, button and page-width utilities, closed class vocabulary
- Layouts `theme` and `password`; minimal header (logo, `<shopify-account>`, cart link) and footer
- Sections: `container` (free-form theme-blocks layout), `header`, `footer`, `main-page`, `main-404`, `main-password`
- Blocks: `heading`, `text`, `button`, `image`, `group`, `spacer`, `liquid`, `oss-credit`
- JS base: `ThemeElement`, event registry, import map
- Agent toolchain: `AGENTS.md`, `CATALOG.json` generator, `CLASS_VOCAB.md` generator, `npm run new` scaffold, `lint`, `verify` / `verify:preview` (Theme Check, freshness, lint, dev-theme push, screenshots, axe)
- Locales: English storefront; English and Simplified Chinese editor labels
