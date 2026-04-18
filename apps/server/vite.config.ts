import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  fmt: {
    ignorePatterns: ["dist/**", "node_modules/**", ".wrangler/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", ".wrangler/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
