// Shared helpers for repo tooling. Node >= 20, no dependencies.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const THEME_DIRS = ['layout', 'templates', 'sections', 'blocks', 'snippets', 'assets', 'config', 'locales'];
/** Folders whose core files are hash-protected in store repos (theme files + CSS sources). */
export const PROTECTED_DIRS = [...THEME_DIRS, 'src'];

export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
export const exists = (rel) => existsSync(join(ROOT, rel));
export const list = (dir, ext) =>
  exists(dir)
    ? readdirSync(join(ROOT, dir))
        .filter((f) => !ext || f.endsWith(ext))
        .sort()
        .map((f) => `${dir}/${f}`)
    : [];

/** File name without extension, e.g. "blocks/custom-foo.liquid" -> "custom-foo". */
export const nameOf = (rel) => basename(rel).replace(/\.[^.]+$/, '');

/**
 * Who owns a theme file.
 * core   = maintained upstream; do not edit in a merchant repo.
 * custom = merchant/agent extension (prefix "custom-"); upgrades never touch it.
 * oss    = open-source edition only (prefix "oss-"); stripped from Theme Store packages.
 */
export function originOf(rel) {
  const n = nameOf(rel).replace(/^_/, '');
  if (n.startsWith('custom-')) return 'custom';
  if (n.startsWith('oss-')) return 'oss';
  return 'core';
}

export function parseSchema(src) {
  const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  if (!m) return null;
  return JSON.parse(m[1]);
}

/** LiquidDoc for blocks/snippets: {% doc %} ... {% enddoc %}. */
export function parseDoc(src) {
  const m = src.match(/{%-?\s*doc\s*-?%}([\s\S]*?){%-?\s*enddoc\s*-?%}/);
  return m ? parseDocBody(m[1]) : null;
}

/** Sections cannot use {% doc %}; they use a leading {% comment %} with the same tags. */
export function parseSectionComment(src) {
  const m = src.match(/^\s*{%-?\s*comment\s*-?%}([\s\S]*?){%-?\s*endcomment\s*-?%}/);
  return m && /@description/.test(m[1]) ? parseDocBody(m[1]) : null;
}

function parseDocBody(body) {
  const text = body.replace(/\r/g, '');
  const tagStart = (t) => text.indexOf(t);
  const out = { description: '', useWhen: '', params: [], example: '' };
  const d = tagStart('@description');
  if (d >= 0) {
    const rest = text.slice(d + '@description'.length);
    const end = rest.search(/\n\s*@(param|example)\b/);
    const desc = (end >= 0 ? rest.slice(0, end) : rest).trim();
    const uw = desc.match(/Use when:\s*([\s\S]*)$/i);
    out.useWhen = uw ? uw[1].replace(/\s+/g, ' ').trim() : '';
    out.description = (uw ? desc.slice(0, uw.index) : desc).replace(/\s+/g, ' ').trim();
  }
  for (const p of text.matchAll(/@param\s+\{([^}]+)\}\s+(\[?[\w.]+\]?)\s*(?:-\s*)?(.*)/g)) {
    const optional = p[2].startsWith('[');
    out.params.push({ name: p[2].replace(/[[\]]/g, ''), type: p[1], optional, description: p[3].trim() });
  }
  const ex = text.indexOf('@example');
  if (ex >= 0) out.example = text.slice(ex + '@example'.length).trim();
  return out;
}

export function loadJSON(rel) {
  return JSON.parse(read(rel));
}

/** Resolve "t:a.b.c" against a schema locale object. */
export function translate(value, locale) {
  if (typeof value !== 'string' || !value.startsWith('t:')) return value;
  return value
    .slice(2)
    .split('.')
    .reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), locale);
}

/** Flatten nested translation object into dotted keys. */
export function flattenKeys(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenKeys(v, key, out);
    else out.add(key);
  }
  return out;
}

/**
 * Expand Tailwind @source inline() brace syntax.
 * "{,md:}grid-cols-{1..3}" -> ["grid-cols-1", ..., "md:grid-cols-3"]
 */
export function expandBraces(pattern) {
  const i = pattern.indexOf('{');
  if (i < 0) return [pattern];
  let depth = 0;
  let j = i;
  for (; j < pattern.length; j++) {
    if (pattern[j] === '{') depth++;
    else if (pattern[j] === '}' && --depth === 0) break;
  }
  const head = pattern.slice(0, i);
  const inner = pattern.slice(i + 1, j);
  const tail = pattern.slice(j + 1);
  const parts = [];
  let buf = '';
  depth = 0;
  for (const ch of inner) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else buf += ch;
  }
  parts.push(buf);
  const options = parts.flatMap((p) => {
    const r = p.match(/^(-?\d+)\.\.(-?\d+)(?:\.\.(\d+))?$/);
    if (!r) return expandBraces(p);
    const [a, b, step = 1] = [Number(r[1]), Number(r[2]), Number(r[3] ?? 1)];
    const vals = [];
    for (let v = a; a <= b ? v <= b : v >= b; v += a <= b ? step : -step) vals.push(String(v));
    return vals;
  });
  return options.flatMap((o) => expandBraces(head + o + tail));
}

/** Escape a class name the way it appears as a CSS selector. */
export function cssEscapeClass(cls) {
  return cls.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}
