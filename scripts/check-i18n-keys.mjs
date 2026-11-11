#!/usr/bin/env node
/**
 * Fails if any key present in en/*.json is missing in ur/*.json (or vice versa).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const enDir = join(root, 'src/locales/en');
const urDir = join(root, 'src/locales/ur');

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const files = readdirSync(enDir).filter((f) => f.endsWith('.json'));
let failed = false;

for (const file of files) {
  const en = flatten(JSON.parse(readFileSync(join(enDir, file), 'utf8')));
  let urRaw;
  try {
    urRaw = JSON.parse(readFileSync(join(urDir, file), 'utf8'));
  } catch {
    console.error(`MISSING ur locale file: ${file}`);
    failed = true;
    continue;
  }
  const ur = flatten(urRaw);
  const missingUr = Object.keys(en).filter((k) => !(k in ur));
  const missingEn = Object.keys(ur).filter((k) => !(k in en));
  if (missingUr.length) {
    failed = true;
    console.error(`[${file}] missing in ur: ${missingUr.join(', ')}`);
  }
  if (missingEn.length) {
    failed = true;
    console.error(`[${file}] missing in en: ${missingEn.join(', ')}`);
  }
}

if (failed) {
  console.error('i18n key check failed');
  process.exit(1);
}
console.log(`i18n key check OK (${files.length} namespaces)`);
