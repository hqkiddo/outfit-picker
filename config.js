/**
 * Supabase configuration – required for Log in / Sign up and cloud sync.
 *
 * 1) Supabase Dashboard → Settings → API → copy Project URL + anon public key (long JWT).
 * 2) Paste below (replace BOTH placeholder strings).
 * 3) Deploy: commit and push this file so your host (Cloudflare Pages, etc.) serves it.
 *
 * Leave placeholders for local-only mode (no account / no sync).
 * https://supabase.com/dashboard/project/_/settings/api
 */
window.OUTFIT_PICKER_CONFIG = {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key'
};
