# Outfit Picker

Your personal stylist – take photos of your clothes and get cute outfit suggestions. Weather-aware.

## Deploy

### Option 1: Cloudflare Pages (recommended)

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) and sign up (free)
2. Click **Create a project** → **Connect to Git**
3. Connect **GitHub** and authorize Cloudflare
4. Select the `outfit-picker` repo
5. Build settings:
   - **Framework preset:** None
   - **Build command:** (leave empty)
   - **Build output directory:** `/` (or leave blank)
6. Click **Save and Deploy** – your site will be at `https://outfit-picker.pages.dev` (or a similar URL)
7. Optional: Customize the subdomain in **Custom domains**

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
