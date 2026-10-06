// Theme rules that Shopify Theme Check does not know about. See AGENTS.md → "Rules enforced by verify".
// Usage: node scripts/lint.mjs [--json]
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {
  read, exists, list, nameOf, originOf, loadJSON, parseDoc, parseSchema, parseSectionComment, cssEscapeClass, PROTECTED_DIRS,
} from './lib.mjs';
import { validateTemplate, templateFiles } from './setting-rules.mjs';

const findings = [];
const add = (level, rule, file, message, fix, line) => findings.push({ level, rule, file, line, message, fix });
const lineOf = (src, index) => src.slice(0, index).split('\n').length;

const liquidFiles = ['layout', 'sections', 'blocks', 'snippets', 'templates'].flatMap((d) => list(d, '.liquid'));
const pkg = loadJSON('package.json');
const repoRole = pkg.agentsws?.repoRole ?? 'upstream';
const css = exists('assets/app.css') ? read('assets/app.css') : '';

// 1. Documentation is required: it is how agents (and CATALOG.json) understand a file.
for (const rel of liquidFiles) {
  const src = read(rel);
  if (rel.startsWith('blocks/') || rel.startsWith('snippets/')) {
    if (!parseDoc(src)?.description) {
      add('error', 'doc-required', rel, 'Missing {% doc %} with @description (and "Use when:").',
        'Add a {% doc %} block at the top: @description <what it does>. Use when: <situations>. Add @param for every snippet argument.');
    }
  }
  if (rel.startsWith('sections/') && !parseSectionComment(src)) {
    add('error', 'doc-required', rel, 'Missing leading {% comment %} with @description.',
      'Start the file with {% comment %} @description ... Use when: ... {% endcomment %} (sections cannot use {% doc %}).');
  }
}

// 2. Never build Tailwind class names from Liquid output: the CSS build cannot see them.
for (const rel of liquidFiles) {
  const src = read(rel);
  for (const attr of src.matchAll(/class="([^"]*)"/g)) {
    const value = attr[1];
    // surface-{{ … }} is allowed: surface classes are plain CSS that always exists.
    const checked = value.replace(/(^|\s)surface-\{\{[^}]*\}\}/g, ' ');
    const glued = checked.match(/[\w:\])/.-]\{\{|\}\}[\w\[-]/);
    if (glued) {
      add('error', 'no-interpolated-classes', rel,
        `Class name built from Liquid output: "${value.slice(0, 80)}"`,
        'Map the setting to complete class names with {% case %}, or pass the value as a CSS variable: style="--x: {{ value }}px" class="gap-(--x)".',
        lineOf(src, attr.index));
    }
  }
}

// 2b. Shopify rejects a file that renders `content_for 'blocks'` more than once (Theme Check does not catch it).
for (const rel of liquidFiles) {
  const n = (read(rel).match(/{%-?\s*content_for\s+['"]blocks['"]/g) ?? []).length;
  if (n > 1) {
    add('error', 'single-content-for-blocks', rel, `content_for 'blocks' appears ${n} times; Shopify allows it once per file.`,
      "Capture it once at the top: {%- capture section_blocks -%}{% content_for 'blocks' %}{%- endcapture -%} and output {{ section_blocks }} where needed.");
  }
}

// 2c. For THEME blocks (@theme, private _blocks) section.blocks only exposes id and type ("@theme"): block.settings is
// empty, so a section (or a block, or a snippet handed section.blocks) that reads child settings silently gets nothing.
// Local blocks defined in the section schema ({ "type", "name", "settings" }) are readable and are not flagged.
{
  // Blank out doc/comments/schema (keeping newlines so line numbers stay right).
  const code = (src) => src.replace(/{%-?\s*(schema|doc|comment)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}|^\s*comment\b[\s\S]*?^\s*endcomment\b/gm,
    (m) => m.replace(/[^\n]/g, ' '));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Variables that hold one entry of `coll`: loop variables and `assign x = coll.first|last|[n]`; plus direct `coll.first.settings`.
  const reads = (src, coll) => {
    const c = esc(coll);
    const vars = [
      ...[...src.matchAll(new RegExp(`\\bfor\\s+(\\w+)\\s+in\\s+${c}\\b(?![.\\w])`, 'g'))].map((m) => m[1]),
      ...[...src.matchAll(new RegExp(`\\bassign\\s+(\\w+)\\s*=\\s*${c}(?:\\.first|\\.last|\\[[^\\]]*\\])(?![.\\w])`, 'g'))].map((m) => m[1]),
    ];
    const patterns = [...new Set(vars)].map((v) => `\\b${esc(v)}\\.(?:settings|type)\\b`);
    patterns.push(`${c}(?:\\.first|\\.last|\\[[^\\]]*\\])\\.(?:settings|type)\\b`);
    return [...src.matchAll(new RegExp(patterns.join('|'), 'g'))];
  };
  const fix = 'For theme blocks, section.blocks only has id and type ("@theme"); settings are empty. Either define the blocks locally in the section schema '
    + '({ "type": "item", "name": "t:…", "settings": [ … ] }) and render them with {% for block in section.blocks %}, '
    + 'or let each child block render and decide for itself (capture {% content_for \'blocks\' %} once and look for a data- marker the block outputs).';
  const seen = new Set();
  const flag = (rel, src, m, via = '') => {
    const line = lineOf(src, m.index);
    if (seen.has(`${rel}:${line}:${m[0]}`)) return; // a snippet rendered several times is reported once
    seen.add(`${rel}:${line}:${m[0]}`);
    add('error', 'theme-block-settings', rel,
      `Reads "${m[0]}" of a theme block from section.blocks${via}: theme block settings are empty there and type is always "@theme".`, fix, line);
  };

  for (const rel of [...list('sections', '.liquid'), ...list('blocks', '.liquid')]) {
    const raw = read(rel);
    if (rel.startsWith('sections/')) {
      const blocks = parseSchema(raw)?.blocks ?? [];
      // A section holds either local blocks (with a name) or theme blocks, never both.
      if (!blocks.length || blocks.some((b) => b.name)) continue;
    }
    const src = code(raw);
    for (const m of reads(src, 'section.blocks')) flag(rel, src, m);
    // Snippets handed section.blocks: {% render 'x', items: section.blocks %}
    for (const r of src.matchAll(/\brender\s+'([\w-]+)'([^%]*)/g)) {
      for (const a of r[2].matchAll(/(\w+):\s*section\.blocks\b(?![.\w])/g)) {
        const snippet = `snippets/${r[1]}.liquid`;
        if (!exists(snippet)) continue;
        const snippetSrc = code(read(snippet));
        for (const m of reads(snippetSrc, a[1])) flag(snippet, snippetSrc, m, ` (passed as ${a[1]} by ${rel})`);
      }
    }
  }
}

// 2d. Setting values in JSON templates, section groups and presets must match the schemas (Shopify rejects them on upload).
for (const rel of templateFiles()) {
  let json;
  try { json = JSON.parse(read(rel).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')); } catch (error) {
    add('error', 'template-settings', rel, `Invalid JSON: ${error.message}`, 'Fix the JSON syntax.');
    continue;
  }
  for (const p of validateTemplate(rel, json)) {
    add('error', 'template-settings', rel, `${p.path}: ${p.message}`, 'Use a value the schema allows (npm run settings -- section … validates for you).');
  }
}

// 3. oss- files are removed from Theme Store packages, so nothing may depend on them from Liquid.
for (const rel of liquidFiles.filter((f) => originOf(f) !== 'oss')) {
  const src = read(rel);
  const m = src.match(/(render\s+'oss-|type:\s*'oss-|"type":\s*"oss-)/);
  if (m) {
    add('error', 'oss-isolation', rel, 'References an oss- (open-source edition only) file.',
      'Place oss- blocks only through JSON templates or section groups; never render them from other Liquid files or presets.', lineOf(src, m.index));
  }
}

// 4. Scripts and styles must come from Shopify's CDN (Theme Store rule, also good for performance).
for (const rel of liquidFiles) {
  const src = read(rel);
  for (const m of src.matchAll(/<(script|link)[^>]+(src|href)="(https?:)?\/\/(?!cdn\.shopify\.com)[^"]+\.(js|css)[^"]*"/g)) {
    add('error', 'remote-asset', rel, `Loads ${m[1]} from an external host.`,
      'Copy the file into assets/ and load it with {{ \'file.js\' | asset_url }}.', lineOf(src, m.index));
  }
}

// 5. custom- files: every static class must exist in app.css (works even when edited without a build).
// Exact selector match: ".gap-1" must be followed by a character that cannot continue a class name.
const hasClass = (token) => new RegExp(`\\.${cssEscapeClass(token).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}(?![\\w-]|\\\\)`).test(css);
if (css) {
  for (const rel of liquidFiles.filter((f) => originOf(f) === 'custom')) {
    const src = read(rel).replace(/{%-?\s*(schema|doc|comment)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}/g, '');
    const own = nameOf(rel).replace(/^_/, '');
    // class="…" attributes and class: '…' arguments (image_tag, placeholder_svg_tag, form…).
    for (const attr of src.matchAll(/class="([^"]*)"|class:\s*'([^']*)'/g)) {
      const tokens = (attr[1] ?? attr[2]).replace(/{{[\s\S]*?}}|{%[\s\S]*?%}/g, ' ').split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        if (token.startsWith(own) || token.startsWith('js-') || token.startsWith('is-')) continue;
        if (!hasClass(token)) {
          add('error', 'unknown-class', rel, `Class "${token}" is not in assets/app.css.`,
            `Run \`npm run build\` to compile it, or use a class from CLASS_VOCAB.md. Component-specific hooks may use the "${own}" prefix.`,
            lineOf(src, attr.index));
        }
      }
    }
  }
}

// 6. zh-CN editor labels for custom work must be translated (the scaffold copies English as a placeholder).
{
  const en = loadJSON('locales/en.default.schema.json');
  const zh = loadJSON('locales/zh-CN.schema.json');
  const walk = (a, b, path) => {
    for (const [k, v] of Object.entries(a ?? {})) {
      const next = [...path, k];
      if (v && typeof v === 'object') walk(v, b?.[k], next);
      else if (b?.[k] === undefined) add('error', 'missing-translation', 'locales/zh-CN.schema.json', `Missing key ${next.join('.')}.`, 'Add the key with a Chinese label.');
      else if (b[k] === v && /[A-Za-z]{3,}/.test(v) && next.some((p) => /^(custom_|private_custom_|oss_)/.test(p))) {
        add('warning', 'untranslated', 'locales/zh-CN.schema.json', `${next.join('.')} is still English ("${v}").`, 'Write the Chinese label for operators using the editor in Chinese.');
      }
    }
  };
  walk(en, zh, []);
}

// 7. Platform limit: 300 files in blocks/ (AI-generated blocks count too).
const blockCount = list('blocks', '.liquid').length;
if (blockCount >= 300) add('error', 'block-limit', 'blocks/', `${blockCount} block files (Shopify limit is 300).`, 'Remove unused custom- blocks.');
else if (blockCount >= 250) add('warning', 'block-limit', 'blocks/', `${blockCount} block files; Shopify limit is 300.`, 'Plan a cleanup of unused custom- blocks.');

// 8. No minified assets (Theme Store rule) and CSS budget.
for (const rel of [...list('assets', '.js'), ...list('assets', '.css')]) {
  const long = read(rel).split('\n').findIndex((l) => l.length > 400);
  if (long >= 0) add('error', 'no-minified-assets', rel, 'Looks minified (line longer than 400 characters).', 'Commit readable source; Shopify minifies assets automatically.', long + 1);
}
// Budget is what shoppers download: gzipped size (Shopify's CDN compresses assets).
if (css) {
  const kb = gzipSync(css, { level: 9 }).length / 1000;
  if (kb > 30) add('error', 'css-budget', 'assets/app.css', `${kb.toFixed(1)} KB gzipped exceeds the 30 KB budget.`, 'Remove unused classes or shrink src/vocab.css.');
  else if (kb > 25) add('warning', 'css-budget', 'assets/app.css', `${kb.toFixed(1)} KB gzipped is close to the 30 KB budget.`, 'Watch new utility usage.');
}

// 9. Core files belong to upstream. In a store repo, changes go into custom- files instead.
if (exists('scripts/core-manifest.json')) {
  const manifest = loadJSON('scripts/core-manifest.json');
  const level = repoRole === 'store' ? 'error' : 'warning';
  // Locales, templates, section groups and settings_data are merchant content: upgrades merge them instead.
  // Templates, section groups, locales and settings_data are merchant content: upgrades merge them instead of overwriting.
  const isMerchantContent = (f) =>
    f.startsWith('templates/') || f.startsWith('locales/') || f.startsWith('config/settings_data') || /^sections\/.*\.json$/.test(f) || f === 'assets/app.css';
  const current = PROTECTED_DIRS.flatMap((d) => list(d)).filter((f) => originOf(f) === 'core' && !isMerchantContent(f));
  for (const rel of current) {
    const hash = createHash('sha256').update(read(rel)).digest('hex');
    if (!manifest.files[rel]) {
      add(level, 'core-protected', rel, 'New file without custom- prefix.',
        repoRole === 'store' ? 'Rename it with the custom- prefix (e.g. blocks/custom-<name>.liquid).' : 'Upstream: run `npm run core:manifest` before release.');
    } else if (manifest.files[rel] !== hash) {
      add(level, 'core-protected', rel, 'Core file modified.',
        repoRole === 'store' ? 'Revert it and put the change in a custom- block or section. Core files are overwritten on upgrade.' : 'Upstream: run `npm run core:manifest` before release.');
    }
  }
}

const errors = findings.filter((f) => f.level === 'error').length;
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ errors, warnings: findings.length - errors, findings }, null, 2));
} else {
  for (const f of findings) console.log(`[${f.level}] ${f.rule} ${f.file}${f.line ? `:${f.line}` : ''}\n  ${f.message}\n  fix: ${f.fix}`);
  console.log(`lint: ${errors} error(s), ${findings.length - errors} warning(s)`);
}
process.exit(errors ? 1 : 0);
