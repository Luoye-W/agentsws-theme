// Demo stores: build the theme with a preset's templates, section groups and settings, then preview or push it.
//   npm run demo -- <preset>            build .demo/<preset> (theme files + presets/<preset>/ on top)
//   npm run demo -- <preset> --push     push it to an unpublished theme "agentsws demo · <preset>" (created or updated)
//   npm run demo -- <preset> --dev      serve it with `shopify theme dev` (needs a store login; --store or SHOPIFY_FLAG_STORE)
//   npm run demo -- <preset> --sync     update a running --dev copy in place: code first, JSON 20 s later (a template that
//                                       arrives before its new section or block is rejected by Shopify with "type must be defined")
// A preset folder mirrors the theme: presets/<name>/templates/*.json, sections/*-group.json, config/settings_data.json.
// Presets are demo content for the open-source theme (and later Theme Store presets); they never change the default templates.
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, THEME_DIRS } from './lib.mjs';

const [name, ...flags] = process.argv.slice(2);
if (!name) {
  const presets = existsSync(join(ROOT, 'presets')) ? readdirSync(join(ROOT, 'presets')) : [];
  console.log(`usage: npm run demo -- <preset> [--push | --dev]\npresets: ${presets.join(', ') || 'none'}`);
  process.exit(1);
}
const presetDir = join(ROOT, 'presets', name);
if (!existsSync(presetDir)) { console.error(`presets/${name} not found`); process.exit(1); }

const out = join(ROOT, '.demo', name);
const isPresetSource = (src) => /(build\.py|\.template\.json)$/.test(src);

if (flags.includes('--sync')) {
  // Copy only changed files (a watcher uploads each write) and never delete: deletions would be synced to the store too.
  const overridden = new Set(readdirSync(presetDir, { recursive: true }).map((rel) => join(out, rel)));
  const copyChanged = (from, to, wantJson, skipOverridden = true) => {
    if (!existsSync(from)) return 0;
    let n = 0;
    for (const entry of readdirSync(from, { withFileTypes: true, recursive: true })) {
      if (!entry.isFile()) continue;
      const src = join(entry.parentPath, entry.name);
      if (isPresetSource(src) || src.endsWith('.json') !== wantJson) continue;
      const dest = join(to, src.slice(from.length));
      if (skipOverridden && overridden.has(dest)) continue;
      const data = readFileSync(src);
      if (existsSync(dest) && readFileSync(dest).equals(data)) continue;
      mkdirSync(join(dest, '..'), { recursive: true });
      writeFileSync(dest, data);
      n += 1;
    }
    return n;
  };
  const phase = (wantJson) => THEME_DIRS.reduce((n, dir) => n + copyChanged(join(ROOT, dir), join(out, dir), wantJson), 0) + copyChanged(presetDir, out, wantJson, false);
  console.log(`synced ${phase(false)} code files`);
  await new Promise((resolve) => setTimeout(resolve, 20000));
  // Files the preset provides are taken from the preset only.
  console.log(`synced ${phase(true)} JSON files`);
  process.exit(0);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const dir of THEME_DIRS) cpSync(join(ROOT, dir), join(out, dir), { recursive: true });
// build.py and *.template.json are preset sources, not theme files
cpSync(presetDir, out, { recursive: true, force: true, filter: (src) => !isPresetSource(src) });
console.log(`built .demo/${name}`);

const shopify = join(ROOT, 'node_modules/.bin/shopify');
const store = (flags.find((f) => f.startsWith('--store=')) ?? '').split('=')[1] || process.env.SHOPIFY_FLAG_STORE;
const storeArgs = store ? ['--store', store] : [];
const themeName = `agentsws demo · ${name}`;

/** Parse the JSON part of CLI output (the CLI may print upgrade notices around it). */
function cliJson(text, open, close) {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  return start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : null;
}

/** Find (or with create=true, push to create) the unpublished theme that belongs to this preset. */
function demoThemeId(create) {
  const list = spawnSync(shopify, ['theme', 'list', '--json', ...storeArgs], { encoding: 'utf8' });
  const themes = cliJson(list.stdout, '[', ']') ?? [];
  const existing = themes.find((t) => t.name === themeName);
  if (existing || !create) return existing?.id;
  const push = spawnSync(shopify, ['theme', 'push', '--path', out, '--json', ...storeArgs, '--unpublished', '--theme', themeName], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] });
  return cliJson(push.stdout, '{', '}').theme.id;
}

if (flags.includes('--push')) {
  const id = demoThemeId(false);
  const args = ['theme', 'push', '--path', out, '--json', ...storeArgs, ...(id ? ['--theme', String(id)] : ['--unpublished', '--theme', themeName])];
  const push = spawnSync(shopify, args, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] });
  console.log(push.stdout.slice(push.stdout.indexOf('{')));
  process.exit(push.status ?? 1);
}
if (flags.includes('--dev')) {
  // Serve against the preset's own unpublished theme, never the shared development theme (other dev servers use that one).
  const id = demoThemeId(true);
  const port = (flags.find((f) => f.startsWith('--port=')) ?? '').split('=')[1] || '9494';
  spawnSync(shopify, ['theme', 'dev', '--path', out, '--theme', String(id), '--port', port, ...storeArgs], { stdio: 'inherit' });
}
