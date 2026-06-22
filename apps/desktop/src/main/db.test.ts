import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { LocalDatabase } from "./db";

test("stores podcasts and episodes in SQLite", () => {
  const db = createTestDatabase();

  db.upsertPodcast({
    description: "A feed",
    feedUrl: "https://example.com/feed.xml",
    id: "podcast_1",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    subscriptionDate: "2026-01-01T00:00:00.000Z",
    title: "Example Feed",
  });
  db.upsertEpisodes([
    {
      audioUrl: "https://example.com/episode.mp3",
      description: "Episode description",
      id: "episode_1",
      podcastId: "podcast_1",
      publishedAt: "2026-01-02T00:00:00.000Z",
      title: "Episode One",
    },
  ]);

  assert.equal(db.listPodcasts()[0]?.title, "Example Feed");
  assert.equal(db.listEpisodesByPodcast("podcast_1")[0]?.audioUrl, "https://example.com/episode.mp3");

  db.close();
});

test("persists playback progress and sync outbox entries", () => {
  const db = createTestDatabase();

  db.upsertPodcast({
    feedUrl: "https://example.com/feed.xml",
    id: "podcast_1",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    subscriptionDate: "2026-01-01T00:00:00.000Z",
    title: "Example Feed",
  });
  db.upsertEpisodes([
    {
      audioUrl: "https://example.com/episode.mp3",
      id: "episode_1",
      podcastId: "podcast_1",
      title: "Episode One",
    },
  ]);

  db.savePlaybackProgress({
    currentTime: 42,
    duration: 100,
    episodeId: "episode_1",
    isCompleted: false,
    podcastId: "podcast_1",
  });
  db.appendOutbox("playback.checkpoint", { episodeId: "episode_1" });

  assert.deepEqual(db.listOutbox().map((entry) => entry.kind), ["playback.checkpoint"]);

  db.close();
});

function createTestDatabase(): LocalDatabase {
  return new LocalDatabase(path.join(mkdtempSync(path.join(tmpdir(), "newcastle-")), "test.sqlite"));
}
