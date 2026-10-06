// The hand-off gate. Run before telling a human a change is ready.
//   npm run verify            static checks (no store needed)
//   npm run verify:preview    + push to your development theme, screenshots and accessibility scan
//                             needs: `shopify theme dev`/`shopify auth` done once, SHOPIFY_FLAG_STORE, STORE_PASSWORD
// Writes .verify/report.json for agents. Exit code 0 = ready to hand off.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const preview = process.argv.includes('--preview');
const report = { ok: true, startedAt: new Date().toISOString(), steps: [] };
mkdirSync(join(ROOT, '.verify'), { recursive: true });

const bin = (name) => join(ROOT, 'node_modules/.bin', name);
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' }, ...opts });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', out: `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\(node:\d+\) \[DEP0040\][^\n]*\n|\(Use `node --trace-deprecation[^\n]*\n/g, '') };
}
function step(name, fix, fn) {
  process.stdout.write(`• ${name} … `);
  let result;
  try {
    result = fn();
  } catch (error) {
    result = { ok: false, detail: String(error?.message ?? error) };
  }
  report.steps.push({ name, ok: result.ok, detail: result.detail?.trim() ?? '', fix: result.ok ? undefined : fix, data: result.data });
  if (!result.ok) report.ok = false;
  console.log(result.ok ? 'ok' : 'FAILED');
  if (!result.ok && result.detail) console.log(result.detail.trim().split('\n').map((l) => `    ${l}`).join('\n'));
  return result;
}

step('class vocabulary docs up to date', 'npm run build:vocab', () => {
  const r = run(process.execPath, ['scripts/build-vocab.mjs', '--check']);
  return { ok: r.code === 0, detail: r.code ? r.out : '' };
});

step('assets/app.css matches sources', 'npm run build:css', () => {
  const r = run(bin('tailwindcss'), ['-i', 'src/tailwind.css', '-o', '.verify/app.css']);
  if (r.code) return { ok: false, detail: r.out };
  const fresh = readFileSync(join(ROOT, '.verify/app.css'), 'utf8');
  const committed = readFileSync(join(ROOT, 'assets/app.css'), 'utf8');
  return { ok: fresh === committed, detail: fresh === committed ? '' : 'assets/app.css is stale (new or removed classes).' };
});

step('CATALOG.json up to date', 'npm run build:catalog', () => {
  const r = run(process.execPath, ['scripts/build-catalog.mjs', '--check']);
  return { ok: r.code === 0, detail: r.code ? r.out : '' };
});

// Store repos compare core files against this manifest, so a stale one makes every store's verify fail after an upgrade.
if ((JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).agentsws?.repoRole ?? 'upstream') === 'upstream') {
  step('core manifest up to date (upstream)', 'npm run core:manifest', () => {
    const r = run(process.execPath, ['scripts/core-manifest.mjs', '--check']);
    return { ok: r.code === 0, detail: r.code ? r.out : '' };
  });
}

step('theme rules (lint)', 'Follow the "fix" line of each finding.', () => {
  const r = run(process.execPath, ['scripts/lint.mjs', '--json']);
  const data = JSON.parse(r.stdout);
  const detail = data.findings.map((f) => `[${f.level}] ${f.rule} ${f.file}${f.line ? `:${f.line}` : ''} — ${f.message}\n  fix: ${f.fix}`).join('\n');
  return { ok: data.errors === 0, detail: data.errors ? detail : '', data };
});

step('Shopify Theme Check', 'Fix each offense; `npx shopify theme check -a` auto-corrects some.', () => {
  const r = run(bin('shopify'), ['theme', 'check', '--output', 'json', '--fail-level', 'error']);
  const jsonStart = r.stdout.indexOf('[');
  if (jsonStart < 0) return { ok: false, detail: r.out };
  const files = JSON.parse(r.stdout.slice(jsonStart));
  const offenses = files.flatMap((f) => f.offenses.map((o) => ({ file: f.path.replace(`${ROOT}/`, ''), ...o })));
  // Theme Check reports severity as a number (0 = error) or a string ("error") depending on the version.
  const isError = (o) => o.severity === 0 || o.severity === 'error';
  const errors = offenses.filter(isError);
  const detail = offenses.map((o) => `[${isError(o) ? 'error' : 'warning'}] ${o.check} ${o.file}:${(o.start_row ?? 0) + 1} — ${o.message}`).join('\n');
  return { ok: errors.length === 0, detail: errors.length ? detail : '', data: { offenses } };
});

if (preview) {
  let previewUrl = '';
  step('push to development theme', 'Run `npx shopify theme dev --store <store>` once to log in, then retry.', () => {
    const r = run(bin('shopify'), ['theme', 'push', '--development', '--json']);
    const m = r.stdout.match(/\{[\s\S]*\}/);
    const data = m ? JSON.parse(m[0]) : null;
    previewUrl = data?.theme?.preview_url ?? '';
    return { ok: r.code === 0 && !!previewUrl, detail: previewUrl ? `preview: ${previewUrl}` : r.out, data: data?.theme };
  });
  if (previewUrl) {
    step('screenshots + accessibility scan', 'Open .verify/shots/results.json; fix serious/critical violations.', () => {
      const r = run(process.execPath, ['tests/snapshot.mjs', previewUrl, '--out', '.verify/shots']);
      return { ok: r.code === 0, detail: r.out };
    });
    report.previewUrl = previewUrl;
  }
}

report.finishedAt = new Date().toISOString();
writeFileSync(join(ROOT, '.verify/report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(report.ok
  ? `\nverify: PASSED${preview ? '' : ' (static). Before hand-off to a human, also run `npm run verify:preview`.'}`
  : '\nverify: FAILED — see fixes above or .verify/report.json');
process.exit(report.ok ? 0 : 1);
