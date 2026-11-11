#!/usr/bin/env node
/**
 * Heuristic report of remaining hardcoded user-facing strings in JSX text nodes.
 * Does not fail the build — advisory for i18n coverage.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'ui' || name === 'locales' || name === 'test' || name === 'assets') continue;
      walk(p);
      continue;
    }
    if (!/\.(tsx|jsx)$/.test(name)) continue;
    const text = readFileSync(p, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('t(') || line.includes('useTranslation')) return;
      // JSX text with letters (skip classNames / imports)
      const m = line.match(/>\s*([A-Za-z][^<{]{2,80})\s*</);
      if (m && !/^(https?|www\.|className|import)/.test(m[1].trim())) {
        hits.push(`${relative(root, p)}:${i + 1}: ${m[1].trim().slice(0, 80)}`);
      }
    });
  }
}

walk(root);
console.log(`Hardcoded string candidates: ${hits.length}`);
hits.slice(0, 80).forEach((h) => console.log(h));
if (hits.length > 80) console.log(`…and ${hits.length - 80} more`);
