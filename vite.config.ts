/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@data": r("./data"),
      "@engine": r("./src/engine"),
      "@art": r("./src/art"),
      "@game": r("./src/game"),
      "@shared": r("./src/shared"),
      "@i18n": r("./src/i18n"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(r("."), "index.html"),
        prezentace: resolve(r("."), "prezentace/index.html"),
        tisk: resolve(r("."), "tisk/index.html"),
      },
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
});
