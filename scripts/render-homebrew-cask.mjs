#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [rawVersion, rawSha256, outputPath] = process.argv.slice(2);
const version = rawVersion?.trim().replace(/^v/, "");
const sha256 = rawSha256?.trim().toLowerCase();

if (!version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error("A stable semantic version is required");
}
if (!sha256 || !/^[a-f0-9]{64}$/.test(sha256)) {
  throw new Error("A 64-character SHA-256 checksum is required");
}
if (!outputPath) {
  throw new Error("An output path is required");
}

const cask = `cask "rajio" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/sichengchen/rajio/releases/download/v#{version}/Rajio-#{version}-universal.dmg"
  name "Rajio"
  desc "Desktop podcast player"
  homepage "https://github.com/sichengchen/rajio"

  app "Rajio.app"
end
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, cask);
console.log(`Rendered Rajio ${version} cask at ${outputPath}`);
