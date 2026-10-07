# Changelog

## Unreleased

- **Fix:** v0.9.0 shipped a stale `CATALOG.json` and `scripts/core-manifest.json` (the version bump changed
  `config/settings_schema.json`), so store repos flagged `settings_schema.json` as an edited core file after upgrading.
  Both regenerated.
- `npm run release -- <x.y.z> "<title>"`: sets the version in `package.json` and `theme_version`, renames
  "## Unreleased", regenerates `CATALOG.json` and the core manifest, then runs verify. It never commits, tags or pushes.

## 0.9.0 — sections, collection, product, swatches, cards, blog & cart, tooling

- **Home & content sections:** `featured-product` (rotating badge), `bundle-builder` (pick N, sticky summary; no discounts
  applied by the theme), `shop-the-feed`, `people-cards` (drawer or profile link, stagger layout), `floating-bar` (overlay
  group, all pages or home only), `scroll-reveal-text`, `inline-image-text` (`[image1]` tokens), `scroll-story` (sticky
  media + steps), `anchor-nav` (scroll spy), `tech-specs` (accordion groups from text or metafields + "in the box"),
  `map` section/block (Google Maps embed from an address, load on click), `contact-detail` block. Slideshow peek layout;
  transparent header over slideshow, video and reveal sections; image-with-text overlap and card layouts; testimonials
  scattered and banner; blog-posts lead list; collection-list tiles; collage subtitles; scrolling-images tilt and twin rows;
  hero inset; timeline split cards; FAQ group cards, jump links and a contact-form panel; "squiggle" heading highlight.
- **Collection & search:** header styles (plain / banner / split) with breadcrumbs (JSON-LD), subcollection tabs with
  counts, filter layouts (sidebar / drawer / horizontal), in-grid promo tiles, pagination numbers / load more / infinite,
  column switch; search result-type tabs and suggestions.
- **Product:** gallery layouts incl. featured column, media width as a percentage (`media_width: custom` +
  `media_width_percent`), ratios incl. "first image" and wide, zoom lightbox / hover / none, mobile peek and dots /
  thumbnails / counter, sticky info toggle, alt-text tags for colour-specific media (`#color:black`), below-media blocks
  (`product-spec-tiles`), `product-vendor`, `product-share`, title with inline price, price on the add-to-cart button,
  image swatches, add-ons card. Note: `media_ratio: natural` now means "each image its own shape" ("first" is the old
  behaviour); phones show dots by default.
- **Swatches:** sources in order: variant image (picture mode), Shopify option-value swatch, `swatch_map` (hex, a file
  from Content → Files, or an image URL), the value name as a colour, then a letter. New settings `swatch_option_names`,
  `swatch_image_preview`, `card_swatch_type`.
- **Cards:** spec icons row and rating chip (per section), sale countdown pill from a real date metafield
  (`card_countdown`), "Sold out" badge position.
- **Blog, article, cart, collections list:** blog collage layout and mobile tag dropdown; article table of contents,
  reading progress, author box, prev/next; cart discount codes, gift wrap, shipping estimator, recommendations, notes;
  collections-list tile / overlay cards.
- **Tooling:** `npm run demo -- <preset> --sync` (code first, JSON after, never deletes); upstream `verify` fails on a
  stale `scripts/core-manifest.json`; lint `template-settings` and `single-content-for-blocks`.
- **Fixes:** hidden screen-reader labels no longer widen the page inside scrolling rows; word spacing kept in generated
  word spans; quick add for products with a single named variant in cart recommendations.

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

## 0.8.0 — batches 5–8: chrome, product, media, content and pages

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

## 0.4.0 — batch 4: theme settings

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
