/**
 * Cloudflare Pages / CI: set SUPABASE_URL and SUPABASE_ANON_KEY as build env vars,
 * add build command: node scripts/write-config.mjs
 * This overwrites root config.js only when both variables are non-empty.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outFile = join(root, 'config.js');

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || '').trim();

function fileStillTemplate() {
  if (!existsSync(outFile)) return true;
  const raw = readFileSync(outFile, 'utf8');
  return (
    raw.includes('your-project.supabase.co') ||
    raw.includes("'your-anon-key'") ||
    raw.includes('"your-anon-key"')
  );
}

if (!url || !key) {
  const onCfPages = /^(1|true)$/i.test(String(process.env.CF_PAGES || '').trim());
  if (onCfPages && fileStillTemplate()) {
    console.error(
      '\n✖ write-config: Cloudflare Pages build, but SUPABASE_URL and SUPABASE_ANON_KEY are not both set,\n' +
        '  and config.js in the repo is still the template.\n' +
        '  Fix: Pages → Settings → Environment variables → add both vars (Production),\n' +
        '  OR commit a real config.js (replace placeholders) and redeploy.\n'
    );
    process.exit(1);
  }
  console.log(
    'write-config: SUPABASE_URL and SUPABASE_ANON_KEY not both set — keeping existing config.js.'
  );
  process.exit(0);
}

let host = '';
try {
  host = new URL(url).hostname;
} catch {
  console.error('write-config: SUPABASE_URL is not a valid URL.');
  process.exit(1);
}

const body = `/**
 * Generated at deploy time from SUPABASE_URL + SUPABASE_ANON_KEY (do not edit on server).
 */
window.OUTFIT_PICKER_CONFIG = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(key)}
};
`;

writeFileSync(outFile, body, 'utf8');
console.log(`write-config: wrote config.js (host: ${host}, key length: ${key.length}).`);
