const { existsSync } = require("node:fs");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { spawn } = require("node:child_process");

const appRoot = path.resolve(__dirname, "..");
const mainEntry = path.join(appRoot, "dist", "main", "main.cjs");

async function ensureBuilt() {
  if (existsSync(mainEntry)) {
    return;
  }

  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["build"], {
      cwd: appRoot,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Desktop build failed with exit code ${code ?? 1}`));
    });
  });
}

ensureBuilt()
  .then(() => import(pathToFileURL(mainEntry).href))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
