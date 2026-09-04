import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      "**/node_modules/**",
      "apps/*/.wrangler/**",
      "apps/*/dist/**",
      "apps/*/test-results/**",
      "apps/web/build/**",
    ],
  },
  lint: {
    ignorePatterns: [
      "**/node_modules/**",
      "apps/*/.wrangler/**",
      "apps/*/dist/**",
      "apps/*/test-results/**",
      "apps/web/build/**",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  run: {
    enablePrePostScripts: true,
  },
  staged: {
    "*.{css,js,json,md,mjs,ts,tsx}": "vp check --fix",
  },
});
