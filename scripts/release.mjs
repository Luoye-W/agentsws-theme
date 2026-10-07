// Upstream maintainers only: prepare a release commit.
//   npm run release -- 0.9.1 "short title"
// Sets the version in package.json and config/settings_schema.json (theme_version), renames CHANGELOG "## Unreleased" to
// "## <version> — <title>", then regenerates CATALOG.json and scripts/core-manifest.json and runs verify. It never commits,
// tags or pushes: review the diff, commit "release: v<version>", then tag and push.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const [version, ...titleWords] = process.argv.slice(2);
const title = titleWords.join(' ').trim();
if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || !title) {
  console.error('usage: npm run release -- <x.y.z> "<short title>"');
  process.exit(1);
}

const pkgPath = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if ((pkg.agentsws?.repoRole ?? 'upstream') !== 'upstream') {
  console.error('release is for the upstream theme repo only (package.json → agentsws.repoRole is not "upstream").');
  process.exit(1);
}
pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// Edit theme_version as text so the schema file keeps its formatting.
const schemaPath = join(ROOT, 'config/settings_schema.json');
const schema = readFileSync(schemaPath, 'utf8');
if (!/"theme_version":\s*"[^"]*"/.test(schema)) {
  console.error('config/settings_schema.json has no theme_version.');
  process.exit(1);
}
writeFileSync(schemaPath, schema.replace(/("theme_version":\s*)"[^"]*"/, `$1"${version}"`));

const changelogPath = join(ROOT, 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf8');
if (!changelog.includes('\n## Unreleased\n')) {
  console.error('CHANGELOG.md has no "## Unreleased" section to release.');
  process.exit(1);
}
writeFileSync(changelogPath, changelog.replace('\n## Unreleased\n', `\n## ${version} — ${title}\n`));

const run = (args) => spawnSync('npm', ['run', ...args], { cwd: ROOT, stdio: 'inherit' }).status ?? 1;
if (run(['build']) || run(['core:manifest']) || run(['verify'])) {
  console.error('\nRelease files written, but build / verify failed — fix before committing.');
  process.exit(1);
}
console.log(`\nReady: review \`git diff\`, then commit "release: v${version}", tag v${version} and push.`);
