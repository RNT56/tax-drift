import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = __dirname;

const legacyFiles = [
  "index.html",
  "app.js",
  "app-core.js",
  "app-decision.js",
  "app-ledger.js",
  "app-research.js",
  "app-ui.js",
  "app-workspace.js",
  "symbol-catalog.js",
  "tax-germany.js",
  "styles.css",
  "sw.js",
  "site.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];

function copyLegacyShell() {
  return {
    name: "copy-legacy-shell",
    closeBundle() {
      const outDir = resolve(rootDir, "dist");
      mkdirSync(outDir, { recursive: true });
      for (const file of legacyFiles) {
        const source = resolve(rootDir, file);
        const target = resolve(outDir, file);
        copyFileSync(source, target);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyLegacyShell()],
  build: {
    rollupOptions: {
      input: {
        portfolio: resolve(rootDir, "portfolio.html")
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
