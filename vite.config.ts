import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = __dirname;

const staticFiles = [
  "site.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];

function copyStaticAssets() {
  return {
    name: "copy-static-assets",
    closeBundle() {
      const outDir = resolve(rootDir, "dist");
      mkdirSync(outDir, { recursive: true });
      for (const file of staticFiles) {
        const source = resolve(rootDir, file);
        const target = resolve(outDir, file);
        copyFileSync(source, target);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyStaticAssets()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(rootDir, "index.html"),
        portfolio: resolve(rootDir, "portfolio.html")
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
