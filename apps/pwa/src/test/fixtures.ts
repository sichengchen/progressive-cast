import type { SyncStateResponse } from "@pgcast/contracts";

import type { Episode, Podcast, RSSFeed } from "@/lib/types";

export const TEST_FEED_URL = "http://127.0.0.1:9131/feed.xml";
export const TEST_AUDIO_URL = "http://127.0.0.1:9131/audio.mp3";

export function createPodcast(overrides: Partial<Podcast> = {}): Podcast {
  return {
    author: "Test Author",
    categories: ["Technology"],
    description: "A test podcast feed.",
    feedUrl: TEST_FEED_URL,
    id: "podcast-1",
    imageUrl: "http://127.0.0.1:9131/cover.png",
    language: "en",
    lastUpdated: new Date("2026-04-18T10:00:00.000Z"),
    subscriptionDate: new Date("2026-04-18T10:00:00.000Z"),
    title: "Sync Test Podcast",
    ...overrides,
  };
}

export function createEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    audioUrl: TEST_AUDIO_URL,
    description: "Episode description",
    guid: "episode-guid-1",
    id: "episode-1",
    podcastId: "podcast-1",
    publishedAt: new Date("2026-04-18T09:00:00.000Z"),
    title: "Episode One",
    ...overrides,
  };
}

export function createFeed(overrides: Partial<RSSFeed> = {}): RSSFeed {
  return {
    author: "Test Author",
    categories: ["Technology"],
    description: "A test podcast feed.",
    episodes: [
      {
        audioUrl: TEST_AUDIO_URL,
        description: "Episode description",
        guid: "episode-guid-1",
        publishedAt: new Date("2026-04-18T09:00:00.000Z"),
        title: "Episode One",
      },
    ],
    feedUrl: TEST_FEED_URL,
    imageUrl: "http://127.0.0.1:9131/cover.png",
    language: "en",
    title: "Sync Test Podcast",
    ...overrides,
  };
}

export function createRemoteSyncState(
  overrides: Partial<SyncStateResponse> = {},
): SyncStateResponse {
  return {
    currentPlayback: {
      currentTime: 123,
      duration: 300,
      locator: {
        audioUrl: TEST_AUDIO_URL,
        episodeGuid: "episode-guid-1",
        feedUrl: TEST_FEED_URL,
      },
      sourceDeviceId: "device-remote",
      updatedAt: "2026-04-18T11:00:00.000Z",
    },
    playbackHistory: [
      {
        currentTime: 80,
        duration: 300,
        isCompleted: false,
        lastPlayedAt: "2026-04-18T10:55:00.000Z",
        locator: {
          audioUrl: TEST_AUDIO_URL,
          episodeGuid: "episode-guid-1",
          feedUrl: TEST_FEED_URL,
        },
        updatedAt: "2026-04-18T10:55:00.000Z",
      },
    ],
    preferences: {
      autoPlay: true,
      itunesSearchEnabled: false,
      skipInterval: 45,
      updatedAt: "2026-04-18T11:00:00.000Z",
      whatsNewCount: 12,
    },
    subscriptions: [
      {
        deletedAt: null,
        feedUrl: TEST_FEED_URL,
        status: "active",
        subscribedAt: "2026-04-18T10:00:00.000Z",
        updatedAt: "2026-04-18T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}
