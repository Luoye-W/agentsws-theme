# agentsws-theme

An open-source Shopify theme built with **Tailwind CSS v4** and **theme blocks**, designed so that **AI agents can customize it safely** for store operators who don't write code.

> Status: **batch 2 of 6 — commerce.** Header and menus, product, collection, search and cart (drawer + page) are in place.
> Home-page sections, content pages and localization arrive next. Not ready for production stores yet.

## Why

Most premium themes are hard to change and harder to upgrade once changed. This theme is built for a different workflow:

```
operator (plain language) → AI agent → custom- files in this repo → preview theme → operator approves → publish
```

- **`AGENTS.md`** — the rules an agent follows: change ladder (settings → data → compose → extend), naming, CSS/JS conventions, hand-off format.
- **`CATALOG.json`** — generated index of every section, block and snippet with purpose, "use when", settings and dependencies.
- **`recipes/`** — step-by-step handling of common requests.
- **`npm run new`** — scaffolds upgrade-safe `custom-` blocks and sections with docs and translations.
- **`npm run verify`** — the gate: Theme Check, Tailwind freshness, catalog, theme-specific lint; `verify:preview` adds screenshots and an accessibility scan on a development theme.
- **`CLASS_VOCAB.md`** — classes that always exist, so edits made without a build (admin code editor, Sidekick) still work.

## Stack

- Liquid with JSON templates, sections, nested theme blocks, LiquidDoc, `color_palette`, `visible_if`
- Tailwind CSS v4 (CLI, CSS-first config); merchant settings flow through CSS variables — no rebuild when settings change
- Vanilla Web Components + import maps; no framework, no bundler
- Shopify CLI 4, Theme Check, Playwright + axe

## Quick start

```bash
npm install
npx shopify theme dev --store your-store.myshopify.com   # first run logs you in
npm run dev                                              # Tailwind watch + theme dev
npm run verify
```

Requires Node 20+. Browser support follows Tailwind v4 (Safari 16.4+, Chrome 111+, Firefox 128+).

## Editions

This repository is the MIT-licensed open-source edition. A separate Theme Store edition may be built later from the same components; Theme Store rules require it to be a distinct theme.

## License

[MIT](LICENSE) © agentsws
