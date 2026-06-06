# Reznor Command Center

Standalone family-app prototype. React via in-browser Babel, no build server, no backend — open `index.html` and it runs.

## Files

- `ReznorCommandCenter.jsx` — React source (the thing you edit)
- `build.js` — regenerates `index.html` from the `.jsx`
- `index.html` — the deployable artifact (committed so GitHub Pages can serve it)

## Edit + rebuild

1. Edit `ReznorCommandCenter.jsx`.
2. `node build.js` — rewrites `index.html`.
3. Open `index.html` in a browser to sanity-check.

## Deploy

`index.html` is plain static HTML. Push to `main`; GitHub Pages serves it.

```sh
git add ReznorCommandCenter.jsx index.html
git commit -m "Update Command Center"
git push origin main
```

If GitHub Pages is enabled on this repo, the live URL updates within a minute or two.

## Notes

- State is in-memory only — reloading the page wipes everything. Persistence is a future task.
- Uploads use in-session object URLs (lost on reload).
- See `TODO(real-build)` comments in the source for the backend wishlist.
