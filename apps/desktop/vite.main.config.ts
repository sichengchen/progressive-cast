import { builtinModules } from "node:module";
import { defineConfig } from "vite";

const external = [
  "better-sqlite3",
  "electron",
  ...builtinModules,
  ...builtinModules.map((module) => `node:${module}`),
];

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/main/main.ts",
      fileName: () => "main.cjs",
      formats: ["cjs"],
    },
    outDir: "dist/main",
    rollupOptions: {
      external,
    },
    sourcemap: true,
    target: "node20",
  },
});
