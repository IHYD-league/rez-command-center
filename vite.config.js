import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Absolute base so script tags resolve from the domain root rather
  // than relative to the current URL. Otherwise deep routes like
  // /share/<token> resolve "./assets/index.js" to /share/assets/...
  // which is a 404, and the page freezes at the loading splash.
  base: "/",
  plugins: [react()],
  build: {
    outDir: "docs",
    // Planning docs (ROADMAP.md, ARCHITECTURE.md) live in docs/ alongside
    // the built site, so we can't blow the whole folder away each build.
    // The `prebuild` npm script wipes only the actual build artifacts.
    emptyOutDir: false,
  },
});
