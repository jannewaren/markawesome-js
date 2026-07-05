#!/usr/bin/env node
// Regenerates the vendored Web Awesome enum slice used by the manifest-coverage
// test (test/fixtures/webawesome-enums.json). Never hand-edit that fixture — it
// is a derived artifact. When Web Awesome ships a new version, run:
//
//   npm run update-wa-manifest <version>      # e.g. 3.11.0
//
// then bump WA_VERSION in test/webawesome-manifest-coverage.test.ts and re-run
// the tests. See CHANGELOG / the sibling Ruby script/update_wa_manifest.rb — the
// two generators share this logic and MUST produce byte-identical output.
//
// It fetches WA's machine-readable Custom Elements Manifest, keeps every wa-*
// custom element's inline-union (string-literal) attributes, and writes them as
// a compact, sorted JSON slice.

import { writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/update-wa-manifest.mjs <version>   (e.g. 3.10.0)');
  process.exit(1);
}

const source = `@awesome.me/webawesome@${version}/dist/custom-elements.json`;
const url = `https://unpkg.com/${source}`;

const response = await fetch(url);
if (!response.ok) {
  console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  process.exit(1);
}
const cem = await response.json();

const allTags = [];
const byTag = {};

for (const mod of cem.modules ?? []) {
  for (const decl of mod.declarations ?? []) {
    if (!decl.customElement || !decl.tagName?.startsWith('wa-')) continue;
    allTags.push(decl.tagName);

    const enums = {};
    for (const attr of decl.attributes ?? []) {
      const text = attr.type?.text;
      // An inline-union enum has a `|`-joined type of single-quoted literals.
      // Opaque named types (e.g. animations) and `string`/`boolean` are skipped.
      if (!text || !text.includes('|')) continue;
      const values = [...text.matchAll(/'([^']*)'/g)].map((m) => m[1]);
      if (values.length === 0) continue;
      enums[attr.name] = values;
    }
    if (Object.keys(enums).length > 0) byTag[decl.tagName] = enums;
  }
}

allTags.sort();

// Build with `_meta` first, then tag keys sorted; attribute keys sorted, value
// order preserved from upstream. Byte-identical to the Ruby generator's output.
const fixture = {
  _meta: { webAwesomeVersion: version, source, allTags },
};
for (const tag of Object.keys(byTag).sort()) {
  const sorted = {};
  for (const attr of Object.keys(byTag[tag]).sort()) sorted[attr] = byTag[tag][attr];
  fixture[tag] = sorted;
}

const outPath = new URL('../test/fixtures/webawesome-enums.json', import.meta.url);
writeFileSync(outPath, JSON.stringify(fixture, null, 2) + '\n');

const attrCount = Object.values(byTag).reduce((n, e) => n + Object.keys(e).length, 0);
console.log(
  `Wrote ${allTags.length} wa-* tags (${attrCount} inline-enum attributes) for WA ${version}`,
);
