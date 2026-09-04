import { builtinModules } from "node:module";
import { defineConfig } from "vite";

const external = ["electron", ...builtinModules, ...builtinModules.map((module) => `node:${module}`)];

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/preload/index.ts",
      fileName: () => "index.cjs",
      formats: ["cjs"],
    },
    outDir: "dist/preload",
    rollupOptions: {
      external,
    },
    sourcemap: true,
    target: "node20",
  },
});
