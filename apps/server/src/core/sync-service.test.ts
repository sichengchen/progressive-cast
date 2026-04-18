import { describe, expect, it, vi } from "vitest";

import { SyncService } from "./sync-service";
import { BadRequestError } from "./errors";
import { createInMemoryRepositories, TestRealtimeCoordinator } from "../test/test-harness";

describe("SyncService", () => {
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
});
