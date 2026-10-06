# Architecture

## Token flow

```
Theme editor settings
  → snippets/theme-tokens.liquid     --p-* palette colors, --s-* fonts/sizes/layout (inline <style>)
  → .surface-* classes (src/tailwind.css) resolve --c-* current colors for a wrapper
  → @theme inline maps Tailwind tokens (bg-bg, text-fg, bg-primary, rounded-btn…) to those variables
```

Merchants change settings without rebuilding CSS. The build only runs when Liquid starts using a new class.

## CSS build

`src/tailwind.css` imports Tailwind with automatic source detection **off** and scans only theme folders.
`src/vocab.css` adds a fixed vocabulary that is compiled no matter what, so edits made without a build
(admin code editor, Sidekick, Custom Liquid) still have a useful set of classes. Output: `assets/app.css`, committed.

## Editions

- **Open-source edition** (this repo, MIT): may include `oss-` files.
- **Theme Store edition** (future, separate product): built from shared components; `oss-` files removed;
  must satisfy Theme Store rules (no app-like features, no designer credits, standard metaobject definitions only).

## Ownership

`core` files come from upstream releases and are hashed in `scripts/core-manifest.json`.
`custom-` files belong to the store. Templates, section groups, locales and `settings_data.json` are merchant content
and are merged, not overwritten, on upgrade.
