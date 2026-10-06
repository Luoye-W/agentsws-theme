// Validates setting VALUES stored in JSON templates, section groups and presets against the section/block schemas.
// Shopify rejects many of these only at upload time ("must be a string", "Tag '<p>' is not permitted"); Theme Check misses them.
import { read, exists, list, parseSchema } from './lib.mjs';

const INLINE_TAGS = new Set(['a', 'b', 'strong', 'em', 'i', 'u', 's', 'br', 'span', 'sup', 'sub']);
const RESOURCE_TYPES = new Set(['product', 'collection', 'page', 'blog', 'article', 'link_list']);

/**
 * Problem with one value, or null when it is acceptable.
 * @param {{type: string, id: string, options?: {value: string}[], min?: number, max?: number, step?: number}} def
 * @param {unknown} value
 * @returns {string | null}
 */
export function settingProblem(def, value) {
  if (value === null || value === undefined || value === '') return null;
  switch (def.type) {
    case 'text': case 'textarea': case 'html': case 'liquid': case 'url': case 'video_url':
    case 'image_picker': case 'video': case 'font_picker': case 'color': case 'color_background': case 'color_scheme':
      return typeof value === 'string' ? null : `must be a string (got ${typeof value})`;
    case 'select': case 'radio': case 'text_alignment': {
      if (typeof value !== 'string') return `must be a string (got ${JSON.stringify(value)})`;
      const allowed = def.options ? def.options.map((o) => o.value) : ['left', 'center', 'right'];
      return allowed.includes(value) ? null : `"${value}" is not one of ${allowed.join(', ')}`;
    }
    case 'checkbox':
      return typeof value === 'boolean' ? null : 'must be true or false';
    case 'range': case 'number': {
      if (typeof value !== 'number') return `must be a number (got ${JSON.stringify(value)})`;
      if (def.type === 'range' && (value < def.min || value > def.max)) return `${value} is outside ${def.min}–${def.max}`;
      return null;
    }
    case 'inline_richtext': {
      if (typeof value !== 'string') return 'must be a string';
      const bad = [...value.matchAll(/<\s*([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase()).find((t) => !INLINE_TAGS.has(t));
      return bad ? `inline rich text cannot contain <${bad}>` : null;
    }
    case 'richtext':
      if (typeof value !== 'string') return 'must be a string';
      return /^\s*<(p|ul|ol|h[1-6])[\s>]/i.test(value) ? null : 'rich text must start with <p>, <ul>, <ol> or <h1>–<h6>';
    case 'product_list': case 'collection_list':
      return Array.isArray(value) ? null : 'must be a list of handles';
    default:
      if (RESOURCE_TYPES.has(def.type)) return typeof value === 'string' ? null : 'must be a handle string';
      return null;
  }
}

/** Schema settings for a section or block type (section-local block types looked up in `localBlocks`). */
function schemaFor(kind, type, localBlocks) {
  if (localBlocks?.[type]) return localBlocks[type];
  const file = `${kind}/${type}.liquid`;
  if (!exists(file)) return null;
  return parseSchema(read(file));
}

/**
 * Walk one template / section-group JSON file and collect problems.
 * @param {string} rel - path for messages
 * @param {object} json
 * @returns {{path: string, message: string}[]}
 */
export function validateTemplate(rel, json) {
  const problems = [];
  const check = (node, kind, path, localBlocks) => {
    if (!node?.type || node.type.startsWith('@') || node.type.startsWith('shopify://')) return;
    const schema = schemaFor(kind, node.type, localBlocks);
    if (!schema) { problems.push({ path, message: `unknown ${kind === 'sections' ? 'section' : 'block'} type "${node.type}"` }); return; }
    const defs = Object.fromEntries((schema.settings ?? []).filter((s) => s.id).map((s) => [s.id, s]));
    for (const [id, value] of Object.entries(node.settings ?? {})) {
      const def = defs[id];
      if (!def) { problems.push({ path: `${path}.${id}`, message: `"${node.type}" has no setting "${id}"` }); continue; }
      const problem = settingProblem(def, value);
      if (problem) problems.push({ path: `${path}.${id}`, message: problem });
    }
    const locals = Object.fromEntries((schema.blocks ?? []).filter((b) => b.settings || b.name).map((b) => [b.type, b]));
    for (const [key, child] of Object.entries(node.blocks ?? {})) {
      check(child, 'blocks', `${path}.${key}`, kind === 'sections' && Object.keys(locals).length ? locals : undefined);
    }
  };
  for (const [key, section] of Object.entries(json.sections ?? {})) check(section, 'sections', key);
  return problems.map((p) => ({ ...p, path: `${rel} → ${p.path}` }));
}

/** Every JSON template, section group and preset in the repo. */
export function templateFiles() {
  const files = [...list('templates', '.json'), ...list('templates/customers', '.json'), ...list('sections', '.json')];
  for (const preset of list('presets').filter((p) => exists(`${p}/templates`) || exists(`${p}/sections`))) {
    files.push(...list(`${preset}/templates`, '.json'), ...list(`${preset}/sections`, '.json'));
  }
  return files;
}
