// Scaffold a new block or section with docs, schema, translations and a catalog entry.
//
//   npm run new -- block trust-badges --description "Row of icons with short trust messages" --use-when "free shipping, returns, warranty badges"
//   npm run new -- section faq-hero --description "..." --use-when "..."
//   npm run new -- snippet price-tag --description "Formats a price with compare-at" --use-when "any price display"
//   npm run new -- block trust-badges-item --private --description "One badge inside custom-trust-badges" --use-when "child of custom-trust-badges only"
//
// Names get the custom- prefix automatically (upgrade-safe). Maintainers may pass --core; --oss marks open-source-only files.
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, exists, read, loadJSON } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const [kind, rawName] = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'));
const fail = (msg) => {
  console.error(`new: ${msg}`);
  process.exit(1);
};

if (!['block', 'section', 'snippet'].includes(kind) || !rawName) {
  fail('usage: npm run new -- <block|section|snippet> <name> --description "..." --use-when "..." [--private] [--core|--oss]');
}
const description = flag('description');
const useWhen = flag('use-when');
if (!description || !useWhen) fail('--description and --use-when are required (they feed CATALOG.json so other agents can find this later).');
if (!/^[a-z][a-z0-9-]*$/.test(rawName)) fail('name must be kebab-case: lowercase letters, digits and dashes.');

let name = rawName;
if (args.includes('--oss')) name = name.startsWith('oss-') ? name : `oss-${name}`;
else if (!args.includes('--core')) name = name.startsWith('custom-') ? name : `custom-${name}`;

// --private: child blocks (e.g. repeating items) hidden from the editor picker; referenced as "_custom-<name>".
if (args.includes('--private')) {
  if (kind !== 'block') fail('--private only applies to blocks.');
  name = `_${name}`;
}

const dir = { block: 'blocks', section: 'sections', snippet: 'snippets' }[kind];
const rel = `${dir}/${name}.liquid`;
if (exists(rel)) fail(`${rel} already exists.`);

const key = name.replace(/^_/, 'private_').replace(/-/g, '_');
const title = rawName.replace(/^_?(custom|oss)-/, '').replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const template = read(`scripts/scaffold/${kind}.liquid`);
const body = template
  .replaceAll('__NAME__', name)
  .replaceAll('__KEY__', key)
  .replaceAll('__TITLE__', title)
  .replaceAll('__DESCRIPTION__', description)
  .replaceAll('__USE_WHEN__', useWhen);
writeFileSync(join(ROOT, rel), body);

// Translations: the same English text goes into every schema locale; translate zh-CN afterwards.
const group = kind === 'block' ? 'blocks' : 'sections';
if (kind === 'snippet') {
  execFileSync(process.execPath, [join(ROOT, 'scripts/build-catalog.mjs')], { stdio: 'inherit' });
  console.log(`\nCreated ${rel}\nNext: fill in @param lines and the markup, then npm run build && npm run verify.\n`);
  process.exit(0);
}
const entry = kind === 'block'
  ? { name: title, settings: { heading: { label: 'Heading' }, text: { label: 'Text' } } }
  : { name: title };
for (const file of ['locales/en.default.schema.json', 'locales/zh-CN.schema.json']) {
  const data = loadJSON(file);
  data[group] ??= {};
  data[group][key] = entry;
  writeFileSync(join(ROOT, file), `${JSON.stringify(data, null, 2)}\n`);
}

execFileSync(process.execPath, [join(ROOT, 'scripts/build-catalog.mjs')], { stdio: 'inherit' });

console.log(`
Created ${rel}
Next:
  1. Edit ${rel} (markup + settings). Add a translation key for every new setting label.
  2. Translate "${group}.${key}" in locales/zh-CN.schema.json.
  3. npm run build      # compiles new classes, refreshes CATALOG.json
  4. npm run verify     # must pass before handing off
`);
