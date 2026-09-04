import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SYNC_PREFERENCES } from "@rajio-app/contracts";

import { SyncService } from "./sync-service";
import { BadRequestError } from "./errors";
import { createInMemoryRepositories, TestRealtimeCoordinator } from "../test/test-harness";

describe("SyncService", () => {
  it("returns complete default state from empty repositories", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T07:00:00.000Z"));

    const service = new SyncService(createInMemoryRepositories(), new TestRealtimeCoordinator());

    await expect(service.getState()).resolves.toEqual({
      currentPlayback: null,
      playbackHistory: [],
      preferences: {
        ...DEFAULT_SYNC_PREFERENCES,
        updatedAt: "2026-04-18T07:00:00.000Z",
      },
      subscriptions: [],
    });

    vi.useRealTimers();
  });

  it("bootstraps new records into empty state and normalizes preferences", async () => {
    const service = new SyncService(createInMemoryRepositories(), new TestRealtimeCoordinator());

    const state = await service.bootstrap({
      currentPlayback: {
        currentTime: -1,
        duration: 300.4,
        locator: {
          audioUrl: " https://cdn.example/current.mp3 ",
          episodeGuid: " current-guid ",
          feedUrl: " https://feed.example/rss.xml ",
        },
        sourceDeviceId: " device-a ",
        updatedAt: "2026-04-18T12:00:00.000Z",
      },
      deviceId: "device-a",
      playbackHistory: [
        {
          currentTime: -5,
          duration: 123.9,
          isCompleted: false,
          lastPlayedAt: "2026-04-18T11:00:00.000Z",
          locator: {
            audioUrl: " https://cdn.example/episode.mp3 ",
            feedUrl: " https://feed.example/rss.xml ",
          },
          updatedAt: "2026-04-18T11:00:00.000Z",
        },
      ],
      preferences: {
        autoPlay: 1 as unknown as boolean,
        itunesSearchEnabled: undefined as unknown as boolean,
        skipInterval: 12.8,
        updatedAt: "2026-04-18T10:00:00.000Z",
        whatsNewCount: 5.4,
      },
      subscriptions: [
        {
          deletedAt: null,
          feedUrl: " https://feed.example/rss.xml ",
          status: "active",
          subscribedAt: "2026-04-18T10:00:00.000Z",
          updatedAt: "2026-04-18T10:00:00.000Z",
        },
      ],
    });

    expect(state.subscriptions[0]).toMatchObject({
      deletedAt: null,
      feedUrl: "https://feed.example/rss.xml",
      status: "active",
    });
    expect(state.playbackHistory[0]).toMatchObject({
      currentTime: 0,
      duration: 123.9,
      locator: {
        audioUrl: "https://cdn.example/episode.mp3",
        feedUrl: "https://feed.example/rss.xml",
      },
    });
    expect(state.currentPlayback).toMatchObject({
      currentTime: 0,
      locator: {
        audioUrl: "https://cdn.example/current.mp3",
        episodeGuid: "current-guid",
        feedUrl: "https://feed.example/rss.xml",
      },
      sourceDeviceId: "device-a",
    });
    expect(state.preferences).toMatchObject({
      autoPlay: true,
      itunesSearchEnabled: true,
      skipInterval: 12,
      whatsNewCount: 5,
    });
  });

  it("keeps newer server-side records when bootstrap sends stale state", async () => {
    const repositories = createInMemoryRepositories({
      currentPlayback: {
        currentTime: 180,
        duration: 300,
        locator: {
          audioUrl: "https://cdn.example/newer.mp3",
          episodeGuid: "newer-episode",
          feedUrl: "https://feed.example/rss.xml",
        },
        sourceDeviceId: "device-server",
        updatedAt: "2026-04-18T12:00:00.000Z",
      },
      playbackHistory: [
        {
          currentTime: 180,
          duration: 300,
          isCompleted: false,
          lastPlayedAt: "2026-04-18T12:00:00.000Z",
          locator: {
            audioUrl: "https://cdn.example/newer.mp3",
            episodeGuid: "newer-episode",
            feedUrl: "https://feed.example/rss.xml",
          },
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
      ],
      preferences: {
        autoPlay: false,
        itunesSearchEnabled: true,
        skipInterval: 30,
        updatedAt: "2026-04-18T12:00:00.000Z",
        whatsNewCount: 10,
      },
      subscriptions: [
        {
          deletedAt: null,
          feedUrl: "https://feed.example/rss.xml",
          status: "active",
          subscribedAt: "2026-04-18T12:00:00.000Z",
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
      ],
    });
    const realtime = new TestRealtimeCoordinator();
    const service = new SyncService(repositories, realtime);

    const state = await service.bootstrap({
      currentPlayback: {
        currentTime: 12,
        duration: 300,
        locator: {
          audioUrl: "https://cdn.example/newer.mp3",
          episodeGuid: "newer-episode",
          feedUrl: "https://feed.example/rss.xml",
        },
        sourceDeviceId: "device-client",
        updatedAt: "2026-04-18T08:00:00.000Z",
      },
      deviceId: "device-client",
      playbackHistory: [
        {
          currentTime: 12,
          duration: 300,
          isCompleted: false,
          lastPlayedAt: "2026-04-18T08:00:00.000Z",
          locator: {
            audioUrl: "https://cdn.example/newer.mp3",
            episodeGuid: "newer-episode",
            feedUrl: "https://feed.example/rss.xml",
          },
          updatedAt: "2026-04-18T08:00:00.000Z",
        },
      ],
      preferences: {
        autoPlay: true,
        itunesSearchEnabled: false,
        skipInterval: 45,
        updatedAt: "2026-04-18T08:00:00.000Z",
        whatsNewCount: 12,
      },
      subscriptions: [
        {
          deletedAt: null,
          feedUrl: "https://feed.example/rss.xml",
          status: "deleted",
          subscribedAt: "2026-04-18T08:00:00.000Z",
          updatedAt: "2026-04-18T08:00:00.000Z",
        },
      ],
    });

    expect(state.currentPlayback?.sourceDeviceId).toBe("device-server");
    expect(state.playbackHistory[0]?.currentTime).toBe(180);
    expect(state.subscriptions[0]).toMatchObject({
      feedUrl: "https://feed.example/rss.xml",
      status: "active",
    });
    expect(state.preferences).toMatchObject({
      autoPlay: false,
      itunesSearchEnabled: true,
      skipInterval: 30,
      whatsNewCount: 10,
    });
  });

  it("allows equal timestamp bootstrap records to replace server records", async () => {
    const repositories = createInMemoryRepositories({
      playbackHistory: [
        {
          currentTime: 10,
          duration: 100,
          isCompleted: false,
          lastPlayedAt: "2026-04-18T12:00:00.000Z",
          locator: {
            audioUrl: "https://cdn.example/episode.mp3",
            feedUrl: "https://feed.example/rss.xml",
          },
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
      ],
      subscriptions: [
        {
          deletedAt: null,
          feedUrl: "https://feed.example/rss.xml",
          status: "active",
          subscribedAt: "2026-04-18T12:00:00.000Z",
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
      ],
    });
    const service = new SyncService(repositories, new TestRealtimeCoordinator());

    const state = await service.bootstrap({
      currentPlayback: null,
      deviceId: "device-a",
      playbackHistory: [
        {
          currentTime: 55,
          duration: 100,
          isCompleted: true,
          lastPlayedAt: "2026-04-18T12:00:00.000Z",
          locator: {
            audioUrl: "https://cdn.example/episode.mp3",
            feedUrl: "https://feed.example/rss.xml",
          },
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
      ],
      preferences: DEFAULT_SYNC_PREFERENCES,
      subscriptions: [
        {
          deletedAt: "2026-04-18T12:00:00.000Z",
          feedUrl: "https://feed.example/rss.xml",
          status: "deleted",
          subscribedAt: "2026-04-18T12:00:00.000Z",
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
      ],
    });

    expect(state.subscriptions[0]).toMatchObject({ status: "deleted" });
    expect(state.playbackHistory[0]).toMatchObject({
      currentTime: 55,
      isCompleted: true,
    });
  });

  it("keeps newer current playback when bootstrap sends stale current playback", async () => {
    const repositories = createInMemoryRepositories({
      currentPlayback: {
        currentTime: 50,
        duration: 100,
        locator: {
          audioUrl: "https://cdn.example/current.mp3",
          feedUrl: "https://feed.example/rss.xml",
        },
        sourceDeviceId: "server",
        updatedAt: "2026-04-18T12:00:00.000Z",
      },
    });
    const service = new SyncService(repositories, new TestRealtimeCoordinator());

    const state = await service.bootstrap({
      currentPlayback: {
        currentTime: 10,
        duration: 100,
        locator: {
          audioUrl: "https://cdn.example/current.mp3",
          feedUrl: "https://feed.example/rss.xml",
        },
        sourceDeviceId: "client",
        updatedAt: "2026-04-18T11:00:00.000Z",
      },
      deviceId: "client",
      playbackHistory: [],
      preferences: DEFAULT_SYNC_PREFERENCES,
      subscriptions: [],
    });

    expect(state.currentPlayback).toMatchObject({
      currentTime: 50,
      sourceDeviceId: "server",
    });
  });

  it("creates active subscriptions and deleted tombstones with trimmed feed URLs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:30:00.000Z"));

    const service = new SyncService(createInMemoryRepositories(), new TestRealtimeCoordinator());

    await service.upsertSubscription(" https://feed.example/rss.xml ");
    expect((await service.getState()).subscriptions[0]).toEqual({
      deletedAt: null,
      feedUrl: "https://feed.example/rss.xml",
      status: "active",
      subscribedAt: "2026-04-18T12:30:00.000Z",
      updatedAt: "2026-04-18T12:30:00.000Z",
    });

    await service.deleteSubscription(" https://feed.example/rss.xml ");
    expect((await service.getState()).subscriptions[0]).toEqual({
      deletedAt: "2026-04-18T12:30:00.000Z",
      feedUrl: "https://feed.example/rss.xml",
      status: "deleted",
      subscribedAt: "2026-04-18T12:30:00.000Z",
      updatedAt: "2026-04-18T12:30:00.000Z",
    });

    vi.useRealTimers();
  });

  it("rejects blank subscription feed URLs and invalid playback locators", async () => {
    const service = new SyncService(createInMemoryRepositories(), new TestRealtimeCoordinator());

    await expect(service.upsertSubscription(" ")).rejects.toThrow(BadRequestError);
    await expect(service.deleteSubscription(" ")).rejects.toThrow(BadRequestError);
    await expect(
      service.saveCheckpoint({
        checkpoint: {
          currentTime: 0,
          duration: 0,
          isCompleted: false,
          lastPlayedAt: "2026-04-18T12:00:00.000Z",
          locator: {
            audioUrl: "",
            feedUrl: "https://feed.example/rss.xml",
          },
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
        deviceId: "device-a",
      }),
    ).rejects.toThrow("Playback locator feedUrl and audioUrl are required");
  });

  it("saves checkpoints, normalizes timestamps, and publishes realtime updates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T13:00:00.000Z"));

    const repositories = createInMemoryRepositories();
    const realtime = new TestRealtimeCoordinator();
    const service = new SyncService(repositories, realtime);

    await service.saveCheckpoint({
      checkpoint: {
        currentTime: -5,
        duration: -20,
        isCompleted: false,
        lastPlayedAt: "2026-04-18T08:00:00.000Z",
        locator: {
          audioUrl: " https://cdn.example/episode.mp3 ",
          episodeGuid: " episode-guid ",
          feedUrl: " https://feed.example/rss.xml ",
        },
        updatedAt: "2026-04-18T08:00:00.000Z",
      },
      deviceId: " device-a ",
    });

    const state = await service.getState();
    expect(state.currentPlayback).toMatchObject({
      currentTime: 0,
      duration: 0,
      sourceDeviceId: "device-a",
      updatedAt: "2026-04-18T13:00:00.000Z",
    });
    expect(state.playbackHistory[0]).toMatchObject({
      currentTime: 0,
      duration: 0,
      locator: {
        audioUrl: " https://cdn.example/episode.mp3 ",
        episodeGuid: " episode-guid ",
        feedUrl: " https://feed.example/rss.xml ",
      },
      updatedAt: "2026-04-18T13:00:00.000Z",
    });
    expect(realtime.publishedEvents).toEqual([
      expect.objectContaining({
        type: "playback.updated",
        currentPlayback: expect.objectContaining({
          sourceDeviceId: "device-a",
        }),
      }),
    ]);

    vi.useRealTimers();
  });

  it("clears current playback and emits playback.cleared for completed checkpoints", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T14:00:00.000Z"));

    const repositories = createInMemoryRepositories();
    const realtime = new TestRealtimeCoordinator();
    const service = new SyncService(repositories, realtime);

    await service.saveCheckpoint({
      checkpoint: {
        currentTime: 300,
        duration: 300,
        isCompleted: true,
        lastPlayedAt: "2026-04-18T13:59:00.000Z",
        locator: {
          audioUrl: "https://cdn.example/episode.mp3",
          episodeGuid: "episode-guid",
          feedUrl: "https://feed.example/rss.xml",
        },
        updatedAt: "2026-04-18T13:59:00.000Z",
      },
      deviceId: "device-a",
    });

    const state = await service.getState();
    expect(state.currentPlayback).toBeNull();
    expect(state.playbackHistory[0]?.isCompleted).toBe(true);
    expect(realtime.publishedEvents.at(-1)).toEqual(
      expect.objectContaining({
        currentPlayback: null,
        type: "playback.cleared",
      }),
    );

    vi.useRealTimers();
  });

  it("normalizes updated preferences and rejects missing device ids", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T15:00:00.000Z"));

    const repositories = createInMemoryRepositories();
    const realtime = new TestRealtimeCoordinator();
    const service = new SyncService(repositories, realtime);

    await expect(
      service.clearCurrentPlayback({
        deviceId: "   ",
      }),
    ).rejects.toThrow(BadRequestError);

    const preferences = await service.updatePreferences({
      preferences: {
        autoPlay: true,
        itunesSearchEnabled: false,
        skipInterval: 0,
        updatedAt: "2026-04-18T10:00:00.000Z",
        whatsNewCount: -3,
      },
    });

    expect(preferences).toMatchObject({
      autoPlay: true,
      itunesSearchEnabled: false,
      skipInterval: 1,
      updatedAt: "2026-04-18T15:00:00.000Z",
      whatsNewCount: 1,
    });

    vi.useRealTimers();
  });

  it("uses shared defaults for invalid numeric preferences", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T16:00:00.000Z"));

    const service = new SyncService(createInMemoryRepositories(), new TestRealtimeCoordinator());

    const preferences = await service.updatePreferences({
      preferences: {
        autoPlay: false,
        itunesSearchEnabled: true,
        skipInterval: Number.NaN,
        updatedAt: "2026-04-18T10:00:00.000Z",
        whatsNewCount: Number.POSITIVE_INFINITY,
      },
    });

    expect(preferences).toEqual({
      autoPlay: false,
      itunesSearchEnabled: true,
      skipInterval: DEFAULT_SYNC_PREFERENCES.skipInterval,
      updatedAt: "2026-04-18T16:00:00.000Z",
      whatsNewCount: DEFAULT_SYNC_PREFERENCES.whatsNewCount,
    });

    vi.useRealTimers();
  });

  it("publishes playback.cleared when current playback is cleared manually", async () => {
    const realtime = new TestRealtimeCoordinator();
    const service = new SyncService(
      createInMemoryRepositories({
        currentPlayback: {
          currentTime: 10,
          duration: 100,
          locator: {
            audioUrl: "https://cdn.example/episode.mp3",
            feedUrl: "https://feed.example/rss.xml",
          },
          sourceDeviceId: "device-a",
          updatedAt: "2026-04-18T12:00:00.000Z",
        },
      }),
      realtime,
    );

    await service.clearCurrentPlayback({ deviceId: "device-a" });

    expect((await service.getState()).currentPlayback).toBeNull();
    expect(realtime.publishedEvents).toEqual([
      {
        checkpoint: null,
        currentPlayback: null,
        type: "playback.cleared",
      },
    ]);
  });
});
