# Outfit Picker

Your personal stylist – take photos of your clothes and get cute outfit suggestions. Weather-aware. Sign in to sync your closet across devices.

## Sync across devices (optional)

To enable login and cloud sync:

1. Create a free project at [supabase.com](https://supabase.com)
2. In Supabase Dashboard → **SQL Editor**, run the contents of `supabase-schema.sql` to create the `closet_data` table
3. In Supabase Dashboard → **Settings** → **API**, copy your project URL and anon (public) key (a long string — never use the `service_role` secret in the browser)
4. Choose **one** way to supply credentials to the deployed site:

   **A – Environment variables (recommended for GitHub + Cloudflare Pages)**  
   You do **not** need to commit secrets. In [Supabase](https://supabase.com/dashboard/project/_/settings/api) copy **Project URL** and the **`anon` `public`** key.

   **B – Edit `config.js` in the repo**  
   Replace both placeholders with your URL and anon key, then commit and push so the host serves that file.

Your closet will sync when you sign in. Without Supabase configured, the app works locally only.

## Deploy

### Option 1: Cloudflare Pages (recommended)

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) and sign up (free)
2. Click **Create a project** → **Connect to Git**
3. Connect **GitHub** and authorize Cloudflare
4. Select the `outfit-picker` repo
5. **Settings** → **Environment variables** (Production, and Preview if you want):
   - `SUPABASE_URL` = your project URL, e.g. `https://abcdefgh.supabase.co`
   - `SUPABASE_ANON_KEY` = the long **anon public** key (not `service_role`)
6. **Settings** → **Builds & deployments** → **Build configuration**:
   - **Framework preset:** None
   - **Build command:** `node scripts/write-config.mjs`
   - **Build output directory:** `/` (root)
7. Save, then **Retry deployment** (or push an empty commit). At build time, `config.js` is generated from those variables and sign-in works after deploy.
8. **Alternative:** skip the build command and commit a real `config.js` instead (option B above).
9. Optional: **Custom domains**

### Option 2: Netlify

1. Go to [netlify.com](https://www.netlify.com) and sign up (free)
2. Click **Add new site** → **Import an existing project**
3. Connect to **GitHub** and choose the `outfit-picker` repo
4. Leave settings as-is (build command: none, publish directory: `/` or root)
5. Click **Deploy** – Netlify gives you a URL like `https://random-name.netlify.app`
6. Optional: Settings → Domain management → add a custom domain

### Option 3: Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **Add New** → **Project**
3. Import the `outfit-picker` repo from GitHub
4. Leave defaults (Framework: Other, root directory: `./`)
5. Click **Deploy** – Vercel gives you a URL like `https://outfit-picker-xxx.vercel.app`

### Option 4: GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Site: `https://hqkiddo.github.io/outfit-picker/`
