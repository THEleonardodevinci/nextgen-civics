/**
 * Loads .env.local into process.env for standalone `node scripts/...` runs.
 *
 * Next.js loads .env.local automatically, but plain Node does not — so a
 * script that only reads process.env will silently see nothing and report a
 * missing key even though the value is sitting in the file. Every script here
 * imports this first.
 *
 * Values already present in the real environment win, so an inline
 * `HUD_API_TOKEN=... npm run ...` still overrides the file.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnvLocal() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(ROOT, name);
    if (!existsSync(p)) continue;

    for (const raw of readFileSync(p, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq < 1) continue;

      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

      let value = line.slice(eq + 1).trim();
      // Strip matching surrounding quotes, and a UTF-8 BOM if Notepad added one.
      value = value.replace(/^\uFEFF/, '').replace(/^(['"])(.*)\1$/s, '$2');

      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadEnvLocal();
