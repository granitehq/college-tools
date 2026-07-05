import fs from 'node:fs';
import path from 'node:path';

const docsRoot = new URL('.', import.meta.url);
const text = (relativePath) => fs.readFileSync(new URL(relativePath, docsRoot), 'utf8');
const exists = (relativePath) => fs.existsSync(new URL(relativePath, docsRoot));

const htmlFiles = fs
  .readdirSync(docsRoot)
  .filter((file) => file.endsWith('.html'))
  .sort();

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const headers = text('_headers');
assert(
  !headers.includes('Cross-Origin-Embedder-Policy: require-corp'),
  'Global COEP require-corp should not be enabled for a site that loads third-party fonts/analytics.'
);

const manifest = JSON.parse(text('manifest.json'));
for (const icon of manifest.icons || []) {
  const iconPath = icon.src.replace(/^\//, '');
  assert(exists(iconPath), `Manifest icon is missing: ${icon.src}`);
}

for (const file of htmlFiles) {
  const html = text(file);
  const internalHtmlLinks = [...html.matchAll(/href="(\/[^"#?]+\.html)(?:[#?][^"]*)?"/g)].map(
    (match) => match[1]
  );
  assert(
    internalHtmlLinks.length === 0,
    `${file} links to .html variants instead of canonical clean URLs: ${internalHtmlLinks.join(', ')}`
  );

  const unsafeBlankTargets = [
    ...html.matchAll(/<a\b(?=[^>]*target="_blank")(?![^>]*rel="[^"]*\bnoopener\b)[^>]*>/g)
  ].map((match) => match[0]);
  assert(
    unsafeBlankTargets.length === 0,
    `${file} has target="_blank" links without rel="noopener".`
  );
}

const home = text('index.html');
assert(
  !home.includes('"@type": "AggregateRating"'),
  'Homepage structured data should not claim aggregate ratings without visible/source evidence.'
);

const readme = text('README.md');
for (const stalePhrase of [
  'screenshots.html',
  'PRIVACY.md',
  'TERMS.md',
  'Replace placeholder images',
  'Feature gallery (with placeholders)'
]) {
  assert(!readme.includes(stalePhrase), `README still contains stale phrase: ${stalePhrase}`);
}

if (failures.length > 0) {
  console.error(`docs validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('docs validation passed');
