# Contributing core features with agents (upstream repo)

For agents building **core** features in this repository (repoRole `upstream`), usually in parallel git worktrees.
Store repos follow AGENTS.md only (custom- files). Everything in AGENTS.md applies here too.

## Clean room (hard rule)
- The only description of reference-theme behaviour is a functional spec written in your own words (kept in the store
  repo, e.g. `docs/reference-theme-spec.md`) and screenshots of public storefronts.
- Never open or read another theme's source (Concept, Dawn, Horizon, …) — not locally, not online.

## Conventions
- Core file names have no `custom-` prefix; private child blocks start with `_`.
- **Theme blocks vs local blocks:** a section cannot read theme-block settings through `section.blocks` (only `id` and
  `type: "@theme"`). If the parent needs child data (tab labels, a product list, JSON-LD), define the children as local
  blocks in the section schema. Use theme blocks when children render themselves (and may nest).
- Colors: `color_scheme` setting + `surface-{{ section.settings.color_scheme }}` on the wrapper; drawers use
  `surface-{{ settings.drawer_color_scheme }}`. Tokens only (`bg-bg text-fg text-muted border-border bg-primary …`).
- Spacing: `--section-pt: calc({{ s.padding_top }}px * var(--s-section-scale, 1))` + the standard pt/pb classes; grids use `grid-gap`.
- Every configurable choice is a setting with a clear id, EN + zh-CN labels, `info` where useful, `visible_if` where relevant.
  Operators and agents (`npm run settings`) configure through these ids.
- Strict Liquid: no filters inside `render`/`content_for`/`image_tag` arguments (assign first); `content_for 'blocks'` once per file.
- Spaces that must survive between generated inline elements (word spans, chips) are output as values (`{{ ' ' }}`),
  not literal text between tags — Shopify's whitespace control strips them and the words run together into one unbreakable line.
- Storefront strings via `t`; schema labels in both schema locales; only ADD locale keys (the merger deep-merges JSON).
- JS: one `<aw-name>` per `assets/c-name.js`, extending `ThemeElement`; reuse `aw-drawer`, `@aw/cart`, `swapFromHTML`;
  no libraries. New events in `assets/events.js` + `docs/events.md`.
- CSS: Tailwind classes; don't edit `src/*`; rare extra CSS in the file's own `{% stylesheet %}` scoped to its root class,
  honouring `prefers-reduced-motion`.
- Accessibility: real controls, keyboard support, focus management, pause controls for motion, contrast via tokens.
- No fake content: neutral placeholders, no invented reviews/ratings/stock/deadlines.

## Worktree tooling
- `ln -s <path-to-your-main-checkout>/node_modules node_modules` (ignored by git).
- Theme Check in a worktree under `.claude/` may report `scripts/scaffold/*` (ignore paths don't match there); judge by
  offenses outside `scripts/`, or run verify on a copy outside `.claude/`.
- `npm run build && npm run verify` must pass. Preview visually with `npm run demo -- <preset> --dev` when a store login exists.
- Commit on your branch; end messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Files only the merger edits
`CHANGELOG.md`, `README.md`, `package.json`, `config/settings_data.json`, `scripts/*` (unless your task says so), `src/*`,
and generated files (`assets/app.css`, `CATALOG.json`, `CLASS_VOCAB.md`, `scripts/core-manifest.json`).

## Report back
Files added/changed/deleted, every new setting id, template/preset changes, new events, what was deferred and why, risks,
branch name and last commit hash.
