import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { LocalDatabase } from "./db";
import { LibraryService } from "./library";
import type { EpisodeSummary, PodcastSummary } from "../shared/types";

test("subscribes to a feed, persists records, and queues sync", async () => {
  const db = createTestDatabase();
  const library = new LibraryService(db, feedReader(feed()));

  try {
    const podcast = await library.subscribe("https://example.com/feed.xml");

    assert.equal(podcast.id, "podcast_1");
    assert.equal(db.getPodcast("podcast_1")?.title, "Example Feed");
    assert.equal(db.listEpisodesByPodcast("podcast_1")[0]?.id, "episode_1");
    assert.deepEqual(db.listOutbox().map(({ kind, payload }) => ({ kind, payload })), [
      {
        kind: "subscription.upsert",
        payload: { feedUrl: "https://example.com/feed.xml" },
      },
    ]);
  } finally {
    db.close();
  }
});

test("unsubscribes existing podcasts with cascade cleanup and skips missing podcasts", async () => {
  const db = createTestDatabase();
  seedPodcast(db, "podcast_1", "Example Feed");
  db.savePlaybackProgress({
    currentTime: 20,
    duration: 100,
    episodeId: "episode_1",
    isCompleted: false,
    podcastId: "podcast_1",
  });
  db.saveDownloadStatus({ episodeId: "episode_1", progress: 50, status: "downloading" });
  const library = new LibraryService(db, feedReader(feed()));

  try {
    await library.unsubscribe("missing");
    assert.equal(db.listOutbox().length, 0);

    await library.unsubscribe("podcast_1");

    assert.equal(db.getPodcast("podcast_1"), null);
    assert.equal(db.getEpisode("episode_1"), null);
    assert.equal(db.getPlaybackProgress("episode_1"), null);
    assert.deepEqual(db.getDownloadStatus("episode_1"), {
      episodeId: "episode_1",
      progress: 0,
      status: "missing",
    });
    assert.deepEqual(db.listOutbox().map(({ kind, payload }) => ({ kind, payload })), [
      {
        kind: "subscription.delete",
        payload: { feedUrl: "https://example.com/feed.xml" },
      },
    ]);
  } finally {
    db.close();
  }
});

test("lists podcasts and episodes in stable local ordering", async () => {
  const db = createTestDatabase();
  seedPodcast(db, "podcast_b", "beta", "https://example.com/b.xml", [
    {
      audioUrl: "https://example.com/b-old.mp3",
      id: "episode_b_old",
      podcastId: "podcast_b",
      publishedAt: "2026-01-01T00:00:00.000Z",
      title: "B Old",
    },
    {
      audioUrl: "https://example.com/b-new.mp3",
      id: "episode_b_new",
      podcastId: "podcast_b",
      publishedAt: "2026-01-03T00:00:00.000Z",
      title: "B New",
    },
  ]);
  seedPodcast(db, "podcast_a", "Alpha", "https://example.com/a.xml", [
    {
      audioUrl: "https://example.com/a.mp3",
      id: "episode_a",
      podcastId: "podcast_a",
      publishedAt: "2026-01-02T00:00:00.000Z",
      title: "A",
    },
  ]);
  const library = new LibraryService(db, feedReader(feed()));

  try {
    assert.deepEqual(
      (await library.listPodcasts()).map((podcast) => podcast.title),
      ["Alpha", "beta"],
    );
    assert.deepEqual(
      (await library.listEpisodesByPodcast("podcast_b")).map((episode) => episode.id),
      ["episode_b_new", "episode_b_old"],
    );
    assert.deepEqual(
      (await library.listEpisodes()).map((episode) => episode.id),
      ["episode_a", "episode_b_new", "episode_b_old"],
    );
  } finally {
    db.close();
  }
});

test("refresh updates feed content while preserving subscription date and downloaded state", async () => {
  const db = createTestDatabase();
  seedPodcast(db, "podcast_1", "Old Title");
  db.markEpisodeDownloaded("episode_1", "/tmp/downloaded.mp3", 123);
  const library = new LibraryService(
    db,
    feedReader(
      feed({
        episodes: [
          {
            audioUrl: "https://example.com/episode.mp3",
            id: "episode_1",
            podcastId: "podcast_1",
            title: "Updated Episode",
          },
        ],
        podcast: {
          feedUrl: "https://example.com/feed.xml",
          id: "podcast_1",
          lastUpdated: "2026-02-01T00:00:00.000Z",
          subscriptionDate: "2026-02-01T00:00:00.000Z",
          title: "Updated Title",
        },
      }),
    ),
  );

  try {
    const refreshed = await library.refresh("podcast_1");

    assert.equal(refreshed.title, "Updated Title");
    assert.equal(refreshed.subscriptionDate, "2026-01-01T00:00:00.000Z");
    assert.equal(db.getEpisode("episode_1")?.title, "Updated Episode");
    assert.equal(db.getEpisode("episode_1")?.downloadedPath, "/tmp/downloaded.mp3");
  } finally {
    db.close();
  }
});

test("refresh rejects missing podcasts", async () => {
  const db = createTestDatabase();
  const library = new LibraryService(db, feedReader(feed()));

  try {
    await assert.rejects(library.refresh("missing"), /Podcast not found/);
  } finally {
    db.close();
  }
});

function createTestDatabase(): LocalDatabase {
  return new LocalDatabase(path.join(mkdtempSync(path.join(tmpdir(), "newcastle-")), "test.sqlite"));
}

function feed(overrides?: {
  episodes?: EpisodeSummary[];
  podcast?: PodcastSummary;
}): { episodes: EpisodeSummary[]; podcast: PodcastSummary } {
  return {
    episodes: overrides?.episodes ?? [
      {
        audioUrl: "https://example.com/episode.mp3",
        id: "episode_1",
        podcastId: "podcast_1",
        publishedAt: "2026-01-02T00:00:00.000Z",
        title: "Episode One",
      },
    ],
    podcast: overrides?.podcast ?? {
      feedUrl: "https://example.com/feed.xml",
      id: "podcast_1",
      lastUpdated: "2026-01-01T00:00:00.000Z",
      subscriptionDate: "2026-01-01T00:00:00.000Z",
      title: "Example Feed",
    },
  };
}

function feedReader(result: { episodes: EpisodeSummary[]; podcast: PodcastSummary }) {
  return {
    async fetchFeed() {
      return result;
    },
  };
}

function seedPodcast(
  db: LocalDatabase,
  id: string,
  title: string,
  feedUrl = "https://example.com/feed.xml",
  episodes: EpisodeSummary[] = [
    {
      audioUrl: "https://example.com/episode.mp3",
      id: "episode_1",
      podcastId: id,
      publishedAt: "2026-01-02T00:00:00.000Z",
      title: "Episode One",
    },
  ],
): void {
  db.upsertPodcast({
    feedUrl,
    id,
    lastUpdated: "2026-01-01T00:00:00.000Z",
    subscriptionDate: "2026-01-01T00:00:00.000Z",
    title,
  });
  db.upsertEpisodes(episodes);
}
