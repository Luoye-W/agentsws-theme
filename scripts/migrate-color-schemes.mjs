// One-off upgrade for store repos (theme 0.2 → 0.4): section/block "surface" settings in JSON templates and
// section groups become "color_scheme" (scheme ids). Safe to run twice. Usage: node scripts/migrate-color-schemes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, list } from './lib.mjs';

const MAP = { default: 'scheme-1', muted: 'scheme-2', inverse: 'scheme-3', primary: 'scheme-4', accent: 'scheme-5' };
let changed = 0;
let total = 0;

function walk(node) {
  if (!node || typeof node !== 'object') return;
  const s = node.settings;
  if (s && typeof s === 'object') {
    if (typeof s.surface === 'string') {
      if (s.surface === 'inherit') {
        s.use_color_scheme = false;
      } else {
        if (node.type === 'group') s.use_color_scheme = true;
        s.color_scheme = MAP[s.surface] ?? 'scheme-1';
      }
      delete s.surface;
      changed += 1;
    }
    if (typeof s.text_surface === 'string') {
      s.text_color_scheme = MAP[s.text_surface] ?? 'scheme-1';
      delete s.text_surface;
      changed += 1;
    }
  }
  for (const child of Object.values(node.sections ?? {})) walk(child);
  for (const child of Object.values(node.blocks ?? {})) walk(child);
}

for (const rel of [...list('templates', '.json'), ...list('sections', '.json')]) {
  const file = join(ROOT, rel);
  const before = readFileSync(file, 'utf8');
  const json = JSON.parse(before.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
  changed = 0;
  walk(json);
  if (changed) {
    writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
    total += changed;
    console.log(`  ${rel}: ${changed}`);
  }
}
console.log(`migrate-color-schemes: ${total} setting(s) converted.`);
