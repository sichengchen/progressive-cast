import { describe, expect, it, vi } from "vitest";

import type { BootstrapSyncRequest } from "@pgcast/contracts";

import { DatabaseService } from "@/lib/database";
import { RSSService } from "@/lib/rss-service";
import { resetPodcastStoreForTests, usePodcastStore } from "@/lib/store";
import {
  createEpisode,
  createFeed,
  createPodcast,
  createRemoteSyncState,
  TEST_AUDIO_URL,
  TEST_FEED_URL,
} from "@/test/fixtures";

import { resetSyncBackendStoreForTests, useSyncBackendStore } from "./store";

const { createSyncClientMock, flushSyncOutboxMock, validateBackendUrlMock } = vi.hoisted(() => ({
  createSyncClientMock: vi.fn(),
  flushSyncOutboxMock: vi.fn(async () => {}),
  validateBackendUrlMock: vi.fn((input: string) => input.trim().replace(/\/+$/, "")),
}));

vi.mock("./client", () => ({
  createSyncClient: createSyncClientMock,
  validateBackendUrl: validateBackendUrlMock,
}));

vi.mock("./queue", () => ({
  flushSyncOutbox: flushSyncOutboxMock,
}));

import { connectSyncBackend, syncNow } from "./bridge";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly listeners = new Map<string, Array<(event?: { data?: unknown }) => void>>();
  readonly readyState = 1;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.emit("open");
    });
  }

  addEventListener(event: string, listener: (event?: { data?: unknown }) => void): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  close(): void {
    this.emit("close");
  }

  emit(event: string, payload?: { data?: unknown }): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}

describe("sync bridge", () => {
  it("rejects empty personal tokens before contacting the backend", async () => {
    await expect(connectSyncBackend("https://sync.example.com", "   ")).rejects.toThrow(
      "Personal token is required.",
    );
    expect(createSyncClientMock).not.toHaveBeenCalled();
  });

  it("bootstraps local state, applies remote data, and opens realtime sync", async () => {
    resetPodcastStoreForTests();
    resetSyncBackendStoreForTests();

    const localPodcast = createPodcast({
      feedUrl: "https://local.example/feed.xml",
      id: "local-podcast",
      title: "Local Podcast",
    });
    const localEpisode = createEpisode({
      audioUrl: "https://local.example/episode.mp3",
      guid: "local-episode-guid",
      id: "local-episode",
      podcastId: localPodcast.id,
      title: "Local Episode",
    });

    await DatabaseService.addPodcast(localPodcast);
    await DatabaseService.addEpisodes([localEpisode]);
    await DatabaseService.savePlaybackProgress({
      currentTime: 64,
      duration: 240,
      episodeId: localEpisode.id,
      id: `${localEpisode.id}_progress`,
      isCompleted: false,
      lastPlayedAt: new Date("2026-04-18T10:00:00.000Z"),
      podcastId: localPodcast.id,
    });

    usePodcastStore.setState((state) => ({
      playbackState: {
        ...state.playbackState,
        currentEpisode: localEpisode,
        currentTime: 64,
        duration: 240,
      },
      podcasts: [localPodcast],
      preferences: {
        ...state.preferences,
        autoPlay: false,
        skipInterval: 20,
        whatsNewCount: 8,
      },
    }));

    useSyncBackendStore.setState({
      apiToken: "secret-token",
      backendUrl: "https://sync.example.com",
      initialSyncCompleted: false,
    });

    const remoteState = createRemoteSyncState();
    const client = {
      bootstrap: vi.fn(async (snapshot: BootstrapSyncRequest) => {
        expect(snapshot.currentPlayback).toMatchObject({
          currentTime: 64,
          duration: 240,
        });
        expect(snapshot.subscriptions).toEqual([
          expect.objectContaining({
            feedUrl: "https://local.example/feed.xml",
          }),
        ]);
        expect(snapshot.preferences).toMatchObject({
          autoPlay: false,
          skipInterval: 20,
          whatsNewCount: 8,
        });
        return remoteState;
      }),
      clearCurrentPlayback: vi.fn(),
      createRealtimeTicket: vi.fn(async () => ({
        expiresAt: "2026-04-18T11:05:00.000Z",
        ticket: "ticket",
        wsUrl: "ws://127.0.0.1:9132/playback?ticket=ticket",
      })),
      deleteSubscription: vi.fn(),
      getMeta: vi.fn(async () => ({
        appVersion: "0.9.0",
        protocolVersion: "1",
        realtime: true,
      })),
      getState: vi.fn(),
      saveCheckpoint: vi.fn(),
      updatePreferences: vi.fn(),
      upsertSubscription: vi.fn(),
    };
    createSyncClientMock.mockReturnValue(client);

    vi.spyOn(RSSService, "parseFeed").mockResolvedValue(createFeed());
    vi.stubGlobal("WebSocket", MockWebSocket);

    await syncNow({ forceBootstrap: true });

    expect(useSyncBackendStore.getState()).toMatchObject({
      connectionStatus: "connected",
      error: null,
      initialSyncCompleted: true,
      serverMeta: {
        appVersion: "0.9.0",
        protocolVersion: "1",
        realtime: true,
      },
    });
    expect(flushSyncOutboxMock).not.toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toBe("ws://127.0.0.1:9132/playback?ticket=ticket");

    const podcasts = await DatabaseService.getPodcasts();
    expect(podcasts).toHaveLength(1);
    expect(podcasts[0]?.feedUrl).toBe(TEST_FEED_URL);

    const remotePodcast = podcasts[0];
    const episodes = remotePodcast
      ? await DatabaseService.getEpisodesByPodcastId(remotePodcast.id)
      : [];
    expect(episodes[0]?.audioUrl).toBe(TEST_AUDIO_URL);

    const progress = episodes[0]
      ? (await DatabaseService.exportData()).playbackProgress.find(
          (entry) => entry.episodeId === episodes[0]?.id,
        )
      : undefined;
    expect(progress).toMatchObject({
      currentTime: 123,
      duration: 300,
    });
    expect(usePodcastStore.getState().preferences).toMatchObject({
      autoPlay: true,
      itunesSearchEnabled: false,
      skipInterval: 45,
      whatsNewCount: 12,
    });
  });
});
