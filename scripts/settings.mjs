// Read and change theme settings safely — the tool agents use for style requests (recipes/change-style.md).
// Every write is validated against the schema (ranges, steps, options, colors, scheme ids) before the file is touched.
//
//   npm run settings -- list [query]                     global settings with current values (query matches id, label, group, 中文)
//   npm run settings -- get <id>
//   npm run settings -- set <id> <value> [<id> <value> …]
//   npm run settings -- set color_schemes.scheme-1.background "#0B0B0D"
//   npm run settings -- schemes                          color schemes + WCAG contrast check
//   npm run settings -- section <template> <section>[.<block>…] [<setting> <value> …]
//        e.g. npm run settings -- section index hero overlay_opacity 40
//             npm run settings -- section index hero.title text "Audio, transformed."
//   add --dry-run to validate without writing.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadJSON, parseSchema, read, exists, translate } from './lib.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
const dryRun = process.argv.includes('--dry-run');
const [command, ...rest] = args;

const en = loadJSON('locales/en.default.schema.json');
const zh = exists('locales/zh-CN.schema.json') ? loadJSON('locales/zh-CN.schema.json') : {};
const label = (v, loc = en) => translate(v, loc) ?? v ?? '';

const schema = loadJSON('config/settings_schema.json');
const dataPath = join(ROOT, 'config/settings_data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
data.current ??= {};

/** All global settings with their group. */
const globalSettings = schema.filter((g) => g.settings).flatMap((g) =>
  g.settings.filter((s) => s.id).map((s) => ({ ...s, group: label(g.name), group_zh: label(g.name, zh) })));
const schemeGroup = globalSettings.find((s) => s.type === 'color_scheme_group');

const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
const current = (s) => (data.current[s.id] !== undefined ? data.current[s.id] : s.default);

/**
 * Validate and coerce a value for a setting definition.
 * @returns {unknown} the value to store
 */
function coerce(def, raw, where) {
  const name = `${where}${def.id}`;
  switch (def.type) {
    case 'range': {
      const n = Number(raw);
      if (Number.isNaN(n)) fail(`${name}: "${raw}" is not a number.`);
      if (n < def.min || n > def.max) fail(`${name}: ${n} is outside ${def.min}–${def.max}${def.unit ?? ''}.`);
      const step = def.step ?? 1;
      if (Math.abs(((n - def.min) / step) - Math.round((n - def.min) / step)) > 1e-9) fail(`${name}: ${n} is not on the ${step} step from ${def.min}.`);
      return n;
    }
    case 'number': {
      const n = Number(raw);
      if (Number.isNaN(n)) fail(`${name}: "${raw}" is not a number.`);
      return n;
    }
    case 'checkbox':
      if (!['true', 'false', true, false].includes(raw)) fail(`${name}: use true or false.`);
      return raw === true || raw === 'true';
    case 'select':
    case 'radio':
    case 'text_alignment': {
      const allowed = def.options ? def.options.map((o) => o.value) : ['left', 'center', 'right'];
      if (!allowed.includes(String(raw))) fail(`${name}: "${raw}" is not one of ${allowed.join(', ')}.`);
      return String(raw);
    }
    case 'color':
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(raw))) fail(`${name}: colors are hex, e.g. #0B0B0D.`);
      return String(raw).toUpperCase();
    case 'color_background':
      return String(raw);
    case 'color_scheme': {
      const ids = Object.keys(data.current.color_schemes ?? {});
      if (!ids.includes(String(raw))) fail(`${name}: "${raw}" is not a color scheme (${ids.join(', ')}).`);
      return String(raw);
    }
    case 'font_picker':
      if (!/^[a-z0-9_]+_[ni][1-9]$/.test(String(raw))) fail(`${name}: font handles look like "chakra_petch_n6" (family_style+weight). Browse Shopify's font library for the handle.`);
      console.warn(`! ${name}: preview the store to confirm "${raw}" exists in Shopify's font library.`);
      return String(raw);
    case 'image_picker':
    case 'video':
      if (raw === '' || raw === 'null') return '';
      if (!/^shopify:\/\/(shop_images|files\/videos)\//.test(String(raw))) fail(`${name}: use shopify://shop_images/<file name> (upload in Content → Files first).`);
      return String(raw);
    case 'collection':
    case 'product':
    case 'link_list':
    case 'page':
    case 'blog':
    case 'article':
      if (!/^[a-z0-9][a-z0-9-]*$/.test(String(raw))) fail(`${name}: use the ${def.type} handle, e.g. "speakers".`);
      return String(raw);
    case 'url':
      if (!/^(shopify:\/\/|\/|https?:\/\/|#)/.test(String(raw))) fail(`${name}: links are shopify://collections/<handle>, /pages/…, https://… or #.`);
      return String(raw);
    default:
      return String(raw);
  }
}

function describe(def) {
  if (def.type === 'range') return `${def.min}–${def.max}${def.unit ?? ''} step ${def.step ?? 1}`;
  if (def.options) return def.options.map((o) => o.value).join(' | ');
  if (def.type === 'checkbox') return 'true | false';
  return def.type;
}

// ---- WCAG contrast ----
const hexToRgb = (hex) => {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

function checkSchemes() {
  const warnings = [];
  for (const [id, scheme] of Object.entries(data.current.color_schemes ?? {})) {
    const c = scheme.settings;
    for (const [fg, bg, what] of [['foreground', 'background', 'text'], ['on_primary', 'primary', 'primary button'], ['on_accent', 'accent', 'accent']]) {
      if (!c[fg] || !c[bg]) continue;
      const ratio = contrast(c[fg], c[bg]);
      if (ratio < 4.5) warnings.push(`${id} ${what}: contrast ${ratio.toFixed(2)}:1 (${c[fg]} on ${c[bg]}) is below 4.5:1.`);
    }
  }
  return warnings;
}

function save() {
  const warnings = checkSchemes();
  for (const w of warnings) console.warn(`! ${w}`);
  if (dryRun) { console.log('dry run: nothing written.'); return; }
  writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log('✓ config/settings_data.json updated. Preview it, then `npm run verify`.');
}

function setGlobal(path, raw) {
  if (path.startsWith('color_schemes.')) {
    const [, schemeId, role] = path.split('.');
    const roleDef = schemeGroup.definition.find((d) => d.id === role);
    if (!roleDef) fail(`color scheme role "${role}" does not exist (${schemeGroup.definition.map((d) => d.id).join(', ')}).`);
    data.current.color_schemes ??= {};
    const scheme = (data.current.color_schemes[schemeId] ??= { settings: {} });
    scheme.settings[role] = coerce(roleDef, raw, `color_schemes.${schemeId}.`);
    console.log(`  color_schemes.${schemeId}.${role} = ${scheme.settings[role]}`);
    return;
  }
  const def = globalSettings.find((s) => s.id === path);
  if (!def) fail(`unknown setting "${path}". Try: npm run settings -- list ${path.split('_')[0]}`);
  data.current[path] = coerce(def, raw, '');
  console.log(`  ${path} = ${JSON.stringify(data.current[path])}`);
}

// ---- section / block settings in JSON templates ----
function sectionCommand([template, target, ...pairs]) {
  if (!template || !target) fail('usage: section <template> <section>[.<block>…] [<setting> <value> …]');
  const file = template.includes('/') ? template : existsSync(join(ROOT, `templates/${template}.json`)) ? `templates/${template}.json` : `sections/${template}.json`;
  if (!exists(file)) fail(`${file} not found.`);
  const json = JSON.parse(read(file));
  const [sectionKey, ...blockPath] = target.split('.');
  let node = json.sections?.[sectionKey];
  if (!node) fail(`${file}: no section "${sectionKey}" (has: ${Object.keys(json.sections ?? {}).join(', ')}).`);
  let type = node.type;
  let kind = 'sections';
  for (const key of blockPath) {
    const next = node.blocks?.[key];
    if (!next) fail(`${file}: "${target}" — no block "${key}" (has: ${Object.keys(node.blocks ?? {}).join(', ') || 'none'}).`);
    node = next;
    type = node.type;
    kind = 'blocks';
  }
  const liquid = `${kind}/${type}.liquid`;
  if (!exists(liquid)) fail(`${liquid} not found (type "${type}").`);
  const defs = (parseSchema(read(liquid))?.settings ?? []).filter((s) => s.id);
  if (!pairs.length) {
    console.log(`${file} → ${target} (${type})`);
    for (const d of defs) {
      const value = node.settings?.[d.id] ?? d.default;
      console.log(`  ${d.id.padEnd(24)} ${JSON.stringify(value ?? null).padEnd(28)} ${describe(d).padEnd(28)} ${label(d.label)} / ${label(d.label, zh)}`);
    }
    return;
  }
  if (pairs.length % 2) fail('settings come in <setting> <value> pairs.');
  node.settings ??= {};
  for (let i = 0; i < pairs.length; i += 2) {
    const def = defs.find((d) => d.id === pairs[i]);
    if (!def) fail(`${type} has no setting "${pairs[i]}" (has: ${defs.map((d) => d.id).join(', ')}).`);
    node.settings[def.id] = coerce(def, pairs[i + 1], `${target}.`);
    console.log(`  ${target}.${def.id} = ${JSON.stringify(node.settings[def.id])}`);
  }
  if (dryRun) { console.log('dry run: nothing written.'); return; }
  writeFileSync(join(ROOT, file), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`✓ ${file} updated. Preview it, then \`npm run verify\`.`);
}

switch (command) {
  case 'list': {
    const q = (rest[0] ?? '').toLowerCase();
    let group = '';
    for (const s of globalSettings) {
      if (s.type === 'color_scheme_group') continue;
      const hay = `${s.id} ${label(s.label)} ${label(s.label, zh)} ${s.group} ${s.group_zh}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      if (s.group !== group) { group = s.group; console.log(`\n## ${s.group} / ${s.group_zh}`); }
      console.log(`  ${s.id.padEnd(26)} ${JSON.stringify(current(s) ?? null).padEnd(24)} ${describe(s).padEnd(34)} ${label(s.label)} / ${label(s.label, zh)}`);
    }
    if (!q || 'color scheme 配色'.includes(q)) console.log('\nColor schemes: npm run settings -- schemes');
    break;
  }
  case 'get': {
    const def = globalSettings.find((s) => s.id === rest[0]);
    if (!def) fail(`unknown setting "${rest[0]}".`);
    console.log(JSON.stringify({ id: def.id, value: current(def), allowed: describe(def), label: label(def.label), label_zh: label(def.label, zh), info: label(def.info) || undefined }, null, 2));
    break;
  }
  case 'set': {
    if (!rest.length || rest.length % 2) fail('usage: set <id> <value> [<id> <value> …]');
    for (let i = 0; i < rest.length; i += 2) setGlobal(rest[i], rest[i + 1]);
    save();
    break;
  }
  case 'schemes': {
    for (const [id, scheme] of Object.entries(data.current.color_schemes ?? {})) {
      console.log(`${id}: ${Object.entries(scheme.settings).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('  ')}`);
    }
    const warnings = checkSchemes();
    console.log(warnings.length ? warnings.map((w) => `! ${w}`).join('\n') : '✓ all schemes pass 4.5:1 contrast.');
    console.log(`\nRoles: ${schemeGroup.definition.map((d) => d.id).join(', ')}. Sections pick a scheme with their "color_scheme" setting.`);
    break;
  }
  case 'section':
    sectionCommand(rest);
    break;
  default:
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
}
