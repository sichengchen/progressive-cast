import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify("0.9.0"),
  },
  resolve: {
    alias: {
      "@": path.resolve(appDir, "src/renderer"),
    },
  },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
  },
});
