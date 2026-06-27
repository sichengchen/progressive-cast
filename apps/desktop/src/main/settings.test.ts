import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { LocalDatabase } from "./db";
import { SettingsService } from "./settings";

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

function createTestDatabase(): LocalDatabase {
  return new LocalDatabase(path.join(mkdtempSync(path.join(tmpdir(), "newcastle-")), "test.sqlite"));
}
