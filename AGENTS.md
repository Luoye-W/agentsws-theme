# AGENTS.md — how to change this theme

You are an AI agent customizing **agentsws-theme**, a Shopify theme (Liquid + theme blocks + Tailwind CSS v4).
The person asking for changes is usually a store operator who does not read code. Your job: make the change
safely, prove it works, and hand back something they can judge by looking at it.

**Read in this order:** this file → `CATALOG.index.json` (what already exists — one line per section, block and snippet, ~40 KB)
→ `recipes/README.md` (how to do common requests). Look up only the entries you need in `CATALOG.json` (full settings,
blocks, params, examples — too large to read whole) or run `npm run settings -- list`.
Do not browse the whole repo first.

---

## 1. Pick the lowest rung that solves the request

| Rung | What | Example | How |
|---|---|---|---|
| L0 Settings | Theme or section settings, reorder sections | "make buttons rounder", "move reviews up" | `npm run settings` (validated) — see `recipes/change-style.md`; or tell the operator where to click |
| L1 Data | Metafields / metaobjects / products / pages content | "add specs to this product" | Shopify admin data; never hard-code store content in Liquid |
| L2 Compose | Existing sections + blocks in a new arrangement | "new landing page for Black Friday" | `recipes/compose-page.md` |
| L3 Extend | New `custom-` block or section | "row of trust badges with icons" | `recipes/add-custom-block.md` |
| L4 Core | Change a core file | bug in a core block | **Not in store repos.** Open an issue/PR upstream |

Before writing code, state which rung you chose and why the lower rungs are not enough.

## 2. Non-negotiables

1. **Only create or edit `custom-*` files** (plus templates, section groups, locales, `settings_data.json`).
   Core files are overwritten on upgrade; `npm run verify` fails when they change in a store repo.
2. **Never publish.** Push only to a development/unpublished theme. A human publishes.
3. **Run `npm run verify` and fix everything** before handing off. Do not weaken or skip checks.
4. **Original code.** All code in this repo is written from scratch. Don't copy or paraphrase code, schema, class names
   or assets from other themes.
5. **No fake urgency.** Countdowns need a real end date; stock messages need real inventory.
6. **Translations.** Every storefront string uses `{{ 'key' | t }}` (`locales/en.default.json`).
   Every schema label uses `t:` keys present in **both** `locales/en.default.schema.json` and `locales/zh-CN.schema.json`.
7. **Routes.** Use `routes.*` for store URLs; never hard-code `/cart`, `/collections`, `/search`.
8. **Customer-facing language ≠ chat language.** Storefront copy (template text, preset defaults) is written in the
   store's customer language (default locale in `locales/*.default.json`), even when the operator talks to you in Chinese.
   If you cannot tell which language shoppers read, ask — or use the operator's wording and flag it in the hand-off.

## 3. Files and naming

```
sections/   page-level containers (schema + {% content_for 'blocks' %})
blocks/     theme blocks — reusable, nestable; most new work goes here
snippets/   render helpers with {% doc %} @param contracts
templates/  JSON page compositions (merchant content)
assets/     app.css (BUILD OUTPUT), c-<name>.js components, component.js, events.js, theme.js
src/        tailwind.css (tokens, utilities), vocab.css (always-compiled classes)
scripts/    build, catalog, lint, verify, scaffold — repo tooling, not uploaded
```

| Prefix | Owner | Upgrade behaviour |
|---|---|---|
| none | core (upstream) | replaced on upgrade — do not edit in store repos |
| `custom-` | store / agent | never touched by upgrades |
| `oss-` | open-source edition only | removed from Theme Store packages; place only via JSON, never `render` them |
| `_` | private block | hidden from the editor picker; must be referenced explicitly |

Generated files — never edit by hand: `assets/app.css`, `CATALOG.json`, `CATALOG.index.json`, `CLASS_VOCAB.md`, `scripts/core-manifest.json`.

## 4. Liquid rules

- Blocks and snippets start with `{% doc %}` containing `@description`, `@param` for every argument and an `@example`. Blocks also need a `Use when:` line (optional for snippets).
  Sections cannot use `{% doc %}`: start them with `{% comment %} @description … Use when: … {% endcomment %}`.
  This text becomes `CATALOG.json` and `CATALOG.index.json`, which is how the next agent finds your work.
- Theme blocks use `"tag": null` and put `{{ block.shopify_attributes }}` on their root element.
- Sections that hold content accept `{ "type": "@theme" }` and `{ "type": "@app" }` blocks.
- **A section cannot read its theme blocks' settings.** For theme blocks (`@theme`, private `_name`) `section.blocks` only has
  `id` and `type` (always `"@theme"`); `.settings` is empty (`.size` and `.id` are fine). When the section must read child
  settings (a list beside the image, tab panels, JSON-LD), define **local blocks** in the section schema
  (`{ "type": "item", "name": "t:…", "settings": [ … ] }`, rendered with `{% for block in section.blocks %}`); otherwise let
  each child render and decide for itself, and have the section capture `{% content_for 'blocks' %}` once and check its
  output for a `data-` marker. Lint rule `theme-block-settings` catches violations.
- Strict Liquid: no filters inside `render`/`content_for` arguments (assign first), no `&&`/`||`, no parentheses in conditions.
- Images: `image_url` + `image_tag` with `widths`, `sizes`, `alt`; placeholders via `placeholder_svg_tag` when blank.
- Settings that only matter in some cases use `visible_if`.
- Do not write custom metaobject types into `metaobject` settings (Theme Store allows only standard definitions). Prefer plain settings that merchants connect to metafields with dynamic sources.

## 5. CSS rules (Tailwind v4)

- Style with Tailwind classes in Liquid. Theme tokens only: `bg-bg text-fg bg-primary text-on-primary text-muted border-border bg-placeholder bg-badge text-sale text-rating rounded-card rounded-media rounded-input rounded-btn rounded-swatch`, type presets `type-display type-h1…type-h6 type-body type-sm type-eyebrow type-nav type-card`, components `btn btn-primary btn-secondary btn-link field page-width page-width-narrow grid-gap`.
- **Every look-and-feel choice must be a setting, not a hard-coded value**, so operators (and agents via `npm run settings`) can change it.
  New global settings go in `config/settings_schema.json` with labels in both schema locales; `CATALOG.json → theme_settings` lists them.
- **Never build a class name from Liquid output** (`gap-{{ x }}`, `bg-[{{ c }}]`). Either map with `{% case %}` to complete class names, or pass numbers as CSS variables: `style="--gap: {{ s.gap }}px" class="gap-(--gap)"`.
  The one exception is `surface-{{ setting }}`: one surface class per color scheme is generated by `snippets/theme-tokens.liquid`.
- Colors come from **color schemes** (Theme settings → Colors). A section or group exposes a `color_scheme` setting and puts
  `surface-{{ section.settings.color_scheme }}` on its wrapper; children use `bg-bg`, `text-fg`, `bg-primary`, `text-muted`, `border-border`.
  Drawers/menus use `surface-{{ settings.drawer_color_scheme }}`.
- Logical spacing for RTL: `ps-* pe-* ms-* me-* start-* end-* text-start text-end`.
- Breakpoints: `md:` ≥ 750px, `lg:` ≥ 990px.
- After adding classes run `npm run build`. If you are editing without a build (admin code editor, Custom Liquid block), use only `CLASS_VOCAB.md`.
- **Parent settings that affect child blocks:** set a CSS variable or a `data-*` attribute on the parent; children inherit variables
  (`size-(--badge-icon)`) or use Tailwind's `in-data-[layout=stack]:…` variant. Watch specificity: `data-[x]:px-4` beats `md:px-8`,
  so pair it with `md:data-[x]:px-8`.
- Class hooks that are not Tailwind classes must start with the file's own name (`custom-badges__item`); lint allows those.
- CSS that Tailwind cannot express: in a `custom-` file, add a `{% stylesheet %}` block scoped under the root class
  (`.custom-badges …`). `src/tailwind.css` and `src/vocab.css` are core — upstream only.

## 6. JavaScript rules

- No frameworks, no bundler. ES modules loaded through the import map in `layout/theme.liquid` (`@aw/component`, `@aw/events`).
- One interactive feature = one custom element `<aw-name>` in `assets/c-name.js`, extending `ThemeElement` from `@aw/component`:
  set up in `mount()`, register listeners with `this.listen()`, find children with `data-ref`.
- Emit/consume events listed in `assets/events.js` and `docs/events.md`; add new ones there.
- Readable source only (no minified files). JSDoc types on exported functions.

## 7. Commands

```bash
npm install                 # once
npm run dev                 # Tailwind watch + shopify theme dev (hot reload on a dev theme)
npm run new -- block <name> --description "…" --use-when "…"    # scaffold (adds custom- prefix, translations, catalog)
npm run build               # vocab docs + app.css + CATALOG.json + CATALOG.index.json
npm run settings -- list    # read / validate / change theme and section settings (see recipes/change-style.md)
npm run verify              # static gate: vocab, css freshness, catalog, lint, Theme Check
npm run verify:preview      # + push to development theme, screenshots (mobile/desktop), accessibility scan
```

`verify:preview` needs a one-time `npx shopify theme dev --store <store>.myshopify.com` login, plus env
`SHOPIFY_FLAG_STORE=<store>.myshopify.com` and `STORE_PASSWORD=<storefront password>` for password-protected stores.
Add pages you changed to `tests/pages.json`. Playwright uses its own Chromium (`npx playwright install chromium`);
set `PW_CHROMIUM_PATH=/path/to/chrome` to use an existing browser instead.

`npm run new` also scaffolds snippets (`npm run new -- snippet <name> …`) and private child blocks (`--private`).
Scaffolded files contain placeholder settings (`heading`, `text`) and English labels in `zh-CN.schema.json` — replace both.

## 8. Rules enforced by `npm run verify`

| Rule | Why |
|---|---|
| `doc-required` | Undocumented files are invisible to the next agent |
| `no-interpolated-classes` | Tailwind cannot compile class names it cannot see |
| `template-settings` | Setting values in templates, section groups and presets must match the schemas (types, options, ranges, rich text) — Shopify rejects them only at upload |
| `single-content-for-blocks` | Shopify rejects a file that renders `content_for 'blocks'` twice — capture it once |
| `theme-block-settings` | `section.blocks` has no settings (and type `"@theme"`) for theme blocks — the read silently gets nothing |
| `unknown-class` (custom- files) | Class must exist in app.css, or the style silently does nothing |
| `missing-translation`, `untranslated` | Operators may use the editor in Chinese |
| `oss-isolation` | oss- files are deleted from Theme Store packages |
| `remote-asset` | Scripts/styles only from Shopify's CDN |
| `core-protected` | Core edits (theme files and `src/`) are lost on upgrade (error when `package.json` → `agentsws.repoRole` is `store`) |
| `no-minified-assets`, `css-budget` (30 KB gzipped), `block-limit` (300) | Theme Store / platform limits |
| stale `assets/app.css`, `CATALOG.json`, `CATALOG.index.json`, `CLASS_VOCAB.md` | Generated files must match sources |
| Shopify Theme Check (errors) | Syntax, schema, translations, missing blocks/assets |

## 9. Hand-off message (write it in the operator's language)

```
What changed: <one sentence, no code terms>
Preview: <preview_url>   (not live yet)
Screenshots: <mobile + desktop, before/after if relevant>
Checks: verify passed · <N> accessibility issues (none serious)
To make it live: <what the human does, e.g. "Publish theme X in Online Store → Themes">
To undo: <how>
```

If `verify:preview` cannot run (no store login, no password), use this instead of Preview/Screenshots and do not
invent results:

```
Preview: not available yet — this environment is not logged in to the store. Someone with store access runs
         `npm run verify:preview` (or I can, once logged in) to get a link and screenshots.
Checks: static checks passed; storefront screenshots and accessibility scan not run.
```
