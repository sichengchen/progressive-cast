import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { LocalDatabase } from "./db";
import { DownloadService } from "./downloads";
import { PlaybackService } from "./playback";

test("downloads audio, records local file state, and playback prefers the local file", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "newcastle-"));
  const db = new LocalDatabase(path.join(root, "test.sqlite"));
  const downloadsDir = path.join(root, "downloads");
  seedEpisode(db);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "https://cdn.example/episode.mp3");
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        "Content-Type": "audio/mpeg",
      },
      status: 200,
    });
  };

  try {
    const status = await new DownloadService(db, downloadsDir).start("episode_1");
    assert.equal(status.status, "downloaded");
    assert.equal(status.progress, 100);
    assert.ok(status.downloadedPath);
    assert.deepEqual(await readFile(status.downloadedPath), Buffer.from([1, 2, 3]));

    const source = await new PlaybackService(db).getSource("episode_1");
    assert.equal(source.isLocal, true);
    assert.equal(source.source, pathToFileURL(status.downloadedPath).toString());

    await new DownloadService(db, downloadsDir).delete("episode_1");
    assert.equal(existsSync(status.downloadedPath), false);
    assert.equal(db.getEpisode("episode_1")?.downloadedPath, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
});

function seedEpisode(db: LocalDatabase): void {
  db.upsertPodcast({
    feedUrl: "https://example.com/feed.xml",
    id: "podcast_1",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    subscriptionDate: "2026-01-01T00:00:00.000Z",
    title: "Example Feed",
  });
  db.upsertEpisodes([
    {
      audioUrl: "https://cdn.example/episode.mp3",
      id: "episode_1",
      podcastId: "podcast_1",
      title: "Episode One",
    },
  ]);
}
