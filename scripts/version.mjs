#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePaths = [
  "apps/desktop/package.json",
  "apps/server/package.json",
  "packages/contracts/package.json",
];

function usage() {
  console.error(
    "Usage: node scripts/version.mjs current | <normalize|set> <version> | bump <version> <major|minor|patch>",
  );
  process.exit(2);
}

function normalizeVersion(value) {
  const normalized = value.trim().replace(/^v/, "");
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(normalized);
  if (!match) {
    throw new Error(`Version must be a stable semantic version (for example, 1.2.3): ${value}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    value: normalized,
  };
}

async function setVersion(version) {
  await Promise.all(
    packagePaths.map(async (packagePath) => {
      const absolutePath = path.join(repositoryRoot, packagePath);
      const packageJson = JSON.parse(await readFile(absolutePath, "utf8"));
      packageJson.version = version;
      await writeFile(absolutePath, `${JSON.stringify(packageJson, null, 2)}\n`);
    }),
  );
}

const [command, rawVersion, bumpType] = process.argv.slice(2);
if (!command) {
  usage();
}

try {
  if (command === "current") {
    const desktopPackage = JSON.parse(
      await readFile(path.join(repositoryRoot, packagePaths[0]), "utf8"),
    );
    console.log(normalizeVersion(desktopPackage.version).value);
  } else {
    if (!rawVersion) {
      usage();
    }

    const version = normalizeVersion(rawVersion);

    switch (command) {
      case "normalize":
        console.log(version.value);
        break;
      case "bump": {
        switch (bumpType) {
          case "major":
            console.log(`${version.major + 1}.0.0`);
            break;
          case "minor":
            console.log(`${version.major}.${version.minor + 1}.0`);
            break;
          case "patch":
            console.log(`${version.major}.${version.minor}.${version.patch + 1}`);
            break;
          default:
            throw new Error(`Bump type must be major, minor, or patch: ${bumpType ?? "missing"}`);
        }
        break;
      }
      case "set":
        await setVersion(version.value);
        console.log(`Set all workspace package versions to ${version.value}`);
        break;
      default:
        usage();
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
