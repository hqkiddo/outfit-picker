/**
 * Supabase configuration – required for Log in / Sign up and cloud sync.
 *
 * 1) Supabase Dashboard → Settings → API → copy Project URL + anon public key (long JWT).
 * 2) Paste below (replace BOTH placeholder strings).
 * 3) Deploy: either commit and push this file, OR on Cloudflare Pages set
 *    SUPABASE_URL + SUPABASE_ANON_KEY and build command: node scripts/write-config.mjs
 *
 * Leave placeholders for local-only mode (no account / no sync).
 * https://supabase.com/dashboard/project/_/settings/api
 */
window.OUTFIT_PICKER_CONFIG = {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key'
};
