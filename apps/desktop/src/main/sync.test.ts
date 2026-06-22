import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { LocalDatabase } from "./db";
import { SyncService } from "./sync";
import type { EpisodeSummary, PodcastSummary } from "../shared/types";

test("pulls remote subscriptions and playback checkpoints into local state", async () => {
  const db = createTestDatabase();
  db.setSettings({
    syncAuthToken: "token",
    syncBaseUrl: "https://sync.example",
  });

  const rss = {
    async fetchFeed(feedUrl: string): Promise<{
      episodes: EpisodeSummary[];
      podcast: PodcastSummary;
    }> {
      return {
        episodes: [
          {
            audioUrl: "https://cdn.example/episode.mp3",
            guid: "episode-guid",
            id: "episode_1",
            podcastId: "podcast_1",
            title: "Remote Episode",
          },
        ],
        podcast: {
          feedUrl,
          id: "podcast_1",
          lastUpdated: "2026-01-01T00:00:00.000Z",
          subscriptionDate: "2026-01-01T00:00:00.000Z",
          title: "Remote Podcast",
        },
      };
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "https://sync.example/api/sync/state");
    return Response.json({
      currentPlayback: null,
      playbackHistory: [
        {
          currentTime: 25,
          duration: 100,
          isCompleted: false,
          lastPlayedAt: "2026-01-02T00:00:00.000Z",
          locator: {
            audioUrl: "https://cdn.example/episode.mp3",
            episodeGuid: "episode-guid",
            feedUrl: "https://example.com/feed.xml",
          },
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      preferences: {
        autoPlay: false,
        itunesSearchEnabled: true,
        skipInterval: 30,
        whatsNewCount: 10,
      },
      subscriptions: [
        {
          deletedAt: null,
          feedUrl: "https://example.com/feed.xml",
          status: "active",
          subscribedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  };

  try {
    await new SyncService(db, rss).syncNow();

    assert.equal(db.listPodcasts()[0]?.title, "Remote Podcast");
    assert.equal(db.listEpisodesByPodcast("podcast_1")[0]?.title, "Remote Episode");
    assert.equal(db.getPlaybackProgress("episode_1")?.currentTime, 25);
  } finally {
    globalThis.fetch = originalFetch;
    db.close();
  }
});

function createTestDatabase(): LocalDatabase {
  return new LocalDatabase(path.join(mkdtempSync(path.join(tmpdir(), "newcastle-")), "test.sqlite"));
}
