#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptsDir, "..");

function getVersion() {
  if (process.env.npm_lifecycle_event?.startsWith("dev")) {
    return `dev-${Date.now()}`;
  }

  try {
    const packageJson = JSON.parse(readFileSync(path.join(appDir, "package.json"), "utf8"));
    const commitHash = execSync("git rev-parse --short HEAD", {
      cwd: appDir,
      encoding: "utf8",
    }).trim();

    return `${packageJson.version}-${commitHash}`;
  } catch {
    return `dev-${Date.now()}`;
  }
}

const swTemplatePath = path.join(appDir, "src", "sw-template.js");
const swOutputPath = path.join(appDir, "public", "sw.js");
const version = getVersion();

const swContent = readFileSync(swTemplatePath, "utf8").replace("__VERSION_PLACEHOLDER__", version);

writeFileSync(swOutputPath, swContent);
