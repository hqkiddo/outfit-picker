/**
 * Cloudflare Pages / CI: set SUPABASE_URL and SUPABASE_ANON_KEY as build env vars,
 * add build command: node scripts/write-config.mjs
 * This overwrites root config.js only when both variables are non-empty.
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outFile = join(root, 'config.js');

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!url || !key) {
  console.log(
    'write-config: SUPABASE_URL and SUPABASE_ANON_KEY not both set — leaving existing config.js (use dashboard env vars for production).'
  );
  process.exit(0);
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
console.log('write-config: wrote config.js from environment variables.');
