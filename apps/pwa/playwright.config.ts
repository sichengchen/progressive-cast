import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    serviceWorkers: "block",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm dev:e2e",
      cwd: appDir,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://127.0.0.1:3000",
    },
    {
      command: "pnpm exec tsx ../server/src/test/playwright-server.ts",
      cwd: appDir,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://127.0.0.1:9131/healthz",
    },
  ],
});
