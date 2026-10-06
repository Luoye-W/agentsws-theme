# Add a custom block (L3)

Only after checking that `container` + existing blocks (recipes/compose-page.md) cannot do it.

## 1. Scaffold

```bash
npm run new -- block <name> --description "<what it shows>" --use-when "<requests it answers>"
```

Creates `blocks/custom-<name>.liquid` with doc, schema, translations (en + zh-CN) and a catalog entry.

## 2. Design the settings first

- One setting per thing the operator will want to change (text, image, link, count, style choice).
- Repeating items (badges, features, logos) → accept child blocks instead of numbered settings:
  create a private item block with `npm run new -- block <name>-item --private …` (→ `blocks/_custom-<name>-item.liquid`) and in the parent schema use
  `"blocks": [{ "type": "_custom-<name>-item" }]` with `{% content_for 'blocks' %}` in the markup.
  Give the parent preset 3 example children so it looks complete when added.
- Icons: an `image_picker` (merchant uploads SVG/PNG) or a `select` over a small built-in set rendered by a snippet.
- Parent settings that children need (icon size, layout on mobile): pass them down as a CSS variable or `data-*` attribute on the parent (AGENTS.md §5).
- Replace the scaffold's placeholder `heading`/`text` settings with the real ones, and remove their translation keys if unused.
- Every `label`/`info`/option label is a `t:blocks.<key>.…` key in both schema locale files. Write real Chinese in `zh-CN.schema.json` (lint warns while it is still English).
- Shared markup used by several custom blocks (e.g. an icon set) → `npm run new -- snippet <name> …`.

## 3. Markup

- Root element: `class="custom-<name> …"` + `{{ block.shopify_attributes }}`; schema `"tag": null`.
- Tailwind tokens and type presets only (AGENTS.md §5). Numbers → CSS variables. Choices → `{% case %}` to full class names.
- Text inside the block is customer-facing: write it in the store's language (AGENTS.md §2.8).
- Accessible: real headings/lists, `alt` on images, visible focus, text contrast from surface tokens.

## 4. Put it somewhere

Add the block to a template or group JSON (usually inside a `container` section), or tell the operator
*Customize → add block → <name>*.

## 5. Build and verify

```bash
npm run build
npm run verify          # fix every finding
npm run verify:preview  # when a store login is available
```

Hand off with the message format in AGENTS.md §9.
