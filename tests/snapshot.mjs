// Screenshots + accessibility scan of a storefront preview.
//   node tests/snapshot.mjs <preview-url> [--out .verify/shots]
// Env: STORE_PASSWORD (dev stores are password protected), PW_CHROMIUM_PATH (optional browser binary).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [previewUrl] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outIndex = process.argv.indexOf('--out');
const outDir = outIndex > 0 ? process.argv[outIndex + 1] : '.verify/shots';
if (!previewUrl) {
  console.error('usage: node tests/snapshot.mjs <preview-url>');
  process.exit(2);
}

const { chromium } = await import('playwright');
const { default: AxeBuilder } = await import('@axe-core/playwright');
const config = JSON.parse(readFileSync(new URL('./pages.json', import.meta.url), 'utf8'));
mkdirSync(outDir, { recursive: true });

const base = new URL(previewUrl);
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const results = [];

for (const viewport of config.viewports) {
  // Reduced motion: scroll-reveal animations would otherwise be captured mid-fade (and skew contrast checks).
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  const page = await context.newPage();

  // Open the preview link once so the preview theme cookie is set, passing the password page if needed.
  await page.goto(base.href, { waitUntil: 'domcontentloaded' });
  if (new URL(page.url()).pathname.startsWith('/password')) {
    if (!process.env.STORE_PASSWORD) throw new Error('Store is password protected: set STORE_PASSWORD.');
    await page.fill('input[type="password"]', process.env.STORE_PASSWORD);
    await Promise.all([page.waitForNavigation(), page.press('input[type="password"]', 'Enter')]);
    await page.goto(base.href, { waitUntil: 'domcontentloaded' });
  }

  for (const target of config.pages) {
    const url = new URL(target.path, base.origin);
    for (const [k, v] of base.searchParams) url.searchParams.set(k, v);
    const file = join(outDir, `${target.name}-${viewport.name}.png`);
    try {
      await page.goto(url.href, { waitUntil: 'load', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.screenshot({ path: file, fullPage: true });
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const violations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }));
      results.push({ page: target.name, viewport: viewport.name, screenshot: file, violations });
      console.log(`${target.name} @ ${viewport.name}: ${violations.length} accessibility violation(s) → ${file}`);
    } catch (error) {
      results.push({ page: target.name, viewport: viewport.name, error: String(error.message ?? error).split('\n')[0] });
      console.log(`${target.name} @ ${viewport.name}: FAILED to load — ${results.at(-1).error}`);
    }
  }
  await context.close();
}

await browser.close();
writeFileSync(join(outDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
const serious = results.flatMap((r) => r.violations).filter((v) => ['serious', 'critical'].includes(v.impact));
const failedPages = results.filter((r) => r.error);
process.exit(serious.length || failedPages.length ? 1 : 0);
