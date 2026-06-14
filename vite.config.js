import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "docs",
    // Planning docs (ROADMAP.md, ARCHITECTURE.md) live in docs/ alongside
    // the built site, so we can't blow the whole folder away each build.
    // The `prebuild` npm script wipes only the actual build artifacts.
    emptyOutDir: false,
    // Source maps temporarily on while we debug the Insights "C is
    // not a function" crash Mike reported. Adds ~3MB to the build
    // but the main bundle still ships minified; only people opening
    // DevTools / error stacks pay the cost. Revert after the bug is
    // fixed.
    sourcemap: true,
  },
});
