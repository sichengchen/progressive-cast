import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const appDir = fileURLToPath(new URL(".", import.meta.url));
const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(appDir, "src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  fmt: {
    ignorePatterns: [
      "dist/**",
      "node_modules/**",
      ".wrangler/**",
      "src/worker-configuration.d.ts",
      "test-results/**",
    ],
  },
  lint: {
    ignorePatterns: [
      "dist/**",
      "node_modules/**",
      ".wrangler/**",
      "src/worker-configuration.d.ts",
      "test-results/**",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "typescript-eslint/no-floating-promises": "off",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**"],
    setupFiles: ["./src/test/setup.ts"],
    passWithNoTests: true,
  },
  pack: {
    dts: false,
    entry: {
      server: "./src/api/server.ts",
    },
    format: ["esm"],
    outDir: "dist/server",
    platform: "node",
    unbundle: true,
  },
});
