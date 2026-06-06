# Reznor Command Center

Family command-center app — React + Vite, with Supabase for auth/storage/data and Netlify for hosting.

## Local dev

```sh
npm install
cp .env.example .env        # then fill in real Supabase values
npm run dev                 # http://localhost:5173
```

## Build

```sh
npm run build               # outputs to dist/
npm run preview             # serve the built bundle locally
```

## Deploy

Pushed to `main` → Netlify auto-builds (`npm run build`) and publishes `dist/`.

Set these env vars in the Netlify site settings (Site configuration → Environment variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Files

- `src/App.jsx` — the React app (was `ReznorCommandCenter.jsx`)
- `src/main.jsx` — Vite entry point, mounts `<App />`
- `src/lib/supabase.js` — Supabase client (reads env vars)
- `index.html` — root HTML shell Vite loads `src/main.jsx` into
- `netlify.toml` — Netlify build config + SPA fallback redirect

## Roadmap

- **Phase 1 (current):** Vite + Supabase scaffold, Netlify deploy
- **Phase 2:** Real auth (Mike, Krissie, Reznor, Evie, Sara); schema in Supabase with `family_id` on every row; row-level security
- **Phase 3:** Photo uploads to Supabase Storage (replacing in-session object URLs)
- **Phase 4:** Public signup → "Create your family" flow for other families
