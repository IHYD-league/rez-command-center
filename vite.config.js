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
  },
});
