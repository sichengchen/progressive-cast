import { describe, expect, it, vi } from "vitest";

import { DatabaseService } from "@/lib/database";
import { createEpisode, createPodcast } from "@/test/fixtures";

import { resetSyncBackendStoreForTests, useSyncBackendStore } from "./store";

const { createSyncClientMock } = vi.hoisted(() => ({
  createSyncClientMock: vi.fn(),
}));

vi.mock("./client", () => ({
  createSyncClient: createSyncClientMock,
}));

import { enqueuePlaybackCheckpoint, enqueueSubscriptionUpsert, flushSyncOutbox } from "./queue";

describe("sync queue", () => {
  it("does not enqueue work until the backend is fully connected", async () => {
    resetSyncBackendStoreForTests();

    await enqueueSubscriptionUpsert("https://feed.example/rss.xml");

    expect(await DatabaseService.getSyncOutboxItems()).toEqual([]);
    expect(createSyncClientMock).not.toHaveBeenCalled();
  });

  it("flushes queued items once and leaves the outbox empty on success", async () => {
    resetSyncBackendStoreForTests();
    useSyncBackendStore.setState({
      apiToken: "secret-token",
      backendUrl: "https://sync.example.com",
      initialSyncCompleted: true,
    });

    const client = {
      clearCurrentPlayback: vi.fn(),
      createRealtimeTicket: vi.fn(),
      deleteSubscription: vi.fn(),
      getMeta: vi.fn(),
      getState: vi.fn(),
      saveCheckpoint: vi.fn(),
      updatePreferences: vi.fn().mockResolvedValue(undefined),
      upsertSubscription: vi.fn().mockResolvedValue(undefined),
    };
    createSyncClientMock.mockReturnValue(client);

    await DatabaseService.putSyncOutboxItem({
      id: "subscription-upsert:https://feed.example/rss.xml",
      kind: "subscription-upsert",
      payload: { feedUrl: "https://feed.example/rss.xml" },
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });
    await DatabaseService.putSyncOutboxItem({
      id: "preferences-put",
      kind: "preferences-put",
      payload: {
        preferences: {
          autoPlay: true,
          itunesSearchEnabled: false,
          skipInterval: 45,
          updatedAt: "2026-04-18T10:00:00.000Z",
          whatsNewCount: 12,
        },
      },
      updatedAt: new Date("2026-04-18T10:05:00.000Z"),
    });

    await Promise.all([flushSyncOutbox(), flushSyncOutbox()]);

    expect(client.upsertSubscription).toHaveBeenCalledWith({
      feedUrl: "https://feed.example/rss.xml",
    });
    expect(client.upsertSubscription).toHaveBeenCalledTimes(1);
    expect(client.updatePreferences).toHaveBeenCalledWith({
      autoPlay: true,
      itunesSearchEnabled: false,
      skipInterval: 45,
      updatedAt: "2026-04-18T10:00:00.000Z",
      whatsNewCount: 12,
    });
    expect(await DatabaseService.getSyncOutboxItems()).toEqual([]);
    expect(useSyncBackendStore.getState()).toMatchObject({
      connectionStatus: "connected",
      error: null,
    });
  });

  it("keeps failed work in the outbox and reports sync errors", async () => {
    resetSyncBackendStoreForTests();
    useSyncBackendStore.setState({
      apiToken: "secret-token",
      backendUrl: "https://sync.example.com",
      initialSyncCompleted: true,
    });

    const client = {
      clearCurrentPlayback: vi.fn(),
      createRealtimeTicket: vi.fn(),
      deleteSubscription: vi.fn(),
      getMeta: vi.fn(),
      getState: vi.fn(),
      saveCheckpoint: vi.fn().mockRejectedValue(new Error("checkpoint failed")),
      updatePreferences: vi.fn(),
      upsertSubscription: vi.fn(),
    };
    createSyncClientMock.mockReturnValue(client);

    const podcast = createPodcast();
    const episode = createEpisode({ podcastId: podcast.id });

    await DatabaseService.putSyncOutboxItem({
      id: "playback-checkpoint:test",
      kind: "playback-checkpoint",
      payload: {
        checkpoint: {
          currentTime: 90,
          duration: 300,
          isCompleted: false,
          lastPlayedAt: "2026-04-18T10:00:00.000Z",
          locator: {
            audioUrl: episode.audioUrl,
            episodeGuid: episode.guid,
            feedUrl: podcast.feedUrl,
          },
          updatedAt: "2026-04-18T10:00:00.000Z",
        },
        deviceId: "device-a",
      },
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });

    await expect(flushSyncOutbox()).rejects.toThrow("checkpoint failed");
    expect(await DatabaseService.getSyncOutboxItems()).toHaveLength(1);
    expect(useSyncBackendStore.getState()).toMatchObject({
      connectionStatus: "error",
      error: "checkpoint failed",
    });
  });

  it("enqueues checkpoint payloads with the current device id when sync is enabled", async () => {
    resetSyncBackendStoreForTests();
    useSyncBackendStore.setState({
      apiToken: "secret-token",
      backendUrl: "https://sync.example.com",
      deviceId: "device-a",
      initialSyncCompleted: true,
    });

    const client = {
      clearCurrentPlayback: vi.fn().mockResolvedValue(undefined),
      createRealtimeTicket: vi.fn(),
      deleteSubscription: vi.fn(),
      getMeta: vi.fn(),
      getState: vi.fn(),
      saveCheckpoint: vi.fn().mockResolvedValue(undefined),
      updatePreferences: vi.fn(),
      upsertSubscription: vi.fn(),
    };
    createSyncClientMock.mockReturnValue(client);

    const podcast = createPodcast();
    const episode = createEpisode({ podcastId: podcast.id });

    await enqueuePlaybackCheckpoint({
      currentTime: 140,
      duration: 300,
      episode,
      isCompleted: false,
      podcast,
    });

    await flushSyncOutbox();

    expect(client.saveCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "device-a",
      }),
    );
  });
});
