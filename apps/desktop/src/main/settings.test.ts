import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { LocalDatabase } from "./db";
import { resolveDefaultDownloadDirectory, SettingsService } from "./settings";

test("keeps the default macOS download directory inside Rajio application data", () => {
  assert.equal(
    resolveDefaultDownloadDirectory(
      "darwin",
      "Rajio",
      "/Users/listener/Library/Application Support",
      "/Users/listener/Downloads",
    ),
    "/Users/listener/Library/Application Support/Rajio/Downloads",
  );
});

test("persists string desktop settings and ignores non-string values", async () => {
  const db = createTestDatabase();
  const settings = new SettingsService(db);

  try {
    await settings.set({
      syncAuthToken: "token",
      syncBaseUrl: "https://sync.example",
      // Runtime guard for values coming from IPC boundaries.
      unexpectedBoolean: true,
    } as Record<string, unknown>);

    assert.deepEqual(await settings.get(), {
      syncAuthToken: "token",
      syncBaseUrl: "https://sync.example",
    });
  } finally {
    db.close();
  }
});

test("uses the desktop default download directory until the user chooses another", async () => {
  const db = createTestDatabase();
  const root = mkdtempSync(path.join(tmpdir(), "newcastle-downloads-"));
  const defaultDownloadDirectory = path.join(root, "default");
  const selectedDownloadDirectory = path.join(root, "selected");
  const settings = new SettingsService(db, defaultDownloadDirectory);

  try {
    assert.deepEqual(await settings.get(), {
      downloadDirectory: defaultDownloadDirectory,
    });

    assert.equal(
      await settings.setDownloadDirectory(selectedDownloadDirectory),
      selectedDownloadDirectory,
    );
    assert.deepEqual(await settings.get(), {
      downloadDirectory: selectedDownloadDirectory,
    });
    await assert.rejects(() => settings.setDownloadDirectory("relative/downloads"), {
      message: "Download directory must be an absolute path.",
    });
  } finally {
    db.close();
  }
});

function createTestDatabase(): LocalDatabase {
  return new LocalDatabase(path.join(mkdtempSync(path.join(tmpdir(), "newcastle-")), "test.sqlite"));
}
