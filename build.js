#!/usr/bin/env node
// Regenerates index.html from ReznorCommandCenter.jsx.
// Run: `node build.js`
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "ReznorCommandCenter.jsx");
const OUT = path.join(__dirname, "index.html");

const jsx = fs.readFileSync(SRC, "utf8");

const withCreateRoot = jsx.replace(
  /^(import React[^\n]*from\s+["']react["'];?\s*\n)/m,
  `$1import { createRoot } from "react-dom/client";\n`
);

if (!/from\s+["']react-dom\/client["']/.test(withCreateRoot)) {
  console.error("build.js: could not inject createRoot import — check the React import line in ReznorCommandCenter.jsx");
  process.exit(1);
}

// In-browser Babel script body has no module exports — strip `export default` from App.
const withoutExport = withCreateRoot.replace(/^export default function App\(/m, "function App(");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Reznor Command Center</title>
<script src="https://cdn.tailwindcss.com"></script>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
    "lucide-react": "https://esm.sh/lucide-react@0.383.0?external=react,react-dom"
  }
}
</script>
<script src="https://unpkg.com/@babel/standalone@7.25.7/babel.min.js"></script>
<style>
  html, body { margin: 0; background: #f1f5f9; }
  #loading { font-family: system-ui, sans-serif; color: #94a3b8; text-align: center; padding-top: 40vh; }
</style>
</head>
<body>
<div id="root"><div id="loading">Loading Reznor Command Center…</div></div>
<script type="text/babel" data-type="module" data-presets="react">
${withoutExport.trimEnd()}


createRoot(document.getElementById("root")).render(<App />);

</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log(`build.js: wrote ${OUT} (${html.length} bytes)`);
