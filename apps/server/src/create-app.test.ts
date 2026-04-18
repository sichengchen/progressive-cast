import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "./adapters/http/create-app";
import type { AuthGuard } from "./core/auth";
import { UnauthorizedError } from "./core/errors";
import type {
  CurrentPlaybackSyncRecord,
  PlaybackCheckpointSyncRecord,
  PlaybackRealtimeEvent,
  RealtimeTicketResponse,
  SubscriptionRecord,
  SyncPreferences,
  SyncStateResponse,
} from "@pgcast/contracts";
import { SyncService } from "./core/sync-service";
import type { ServerRepositories } from "./core/repositories";
import type { RealtimeCoordinator } from "./core/realtime";

class TestAuthGuard implements AuthGuard {
  async authorize(request: Request): Promise<void> {
    if (request.headers.get("Authorization") !== "Bearer test-token") {
      throw new UnauthorizedError();
    }
  }
}

class TestRealtimeCoordinator implements RealtimeCoordinator {
  readonly publishedEvents: PlaybackRealtimeEvent[] = [];

  async issueTicket(): Promise<RealtimeTicketResponse> {
    return {
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      ticket: "ticket",
      wsUrl: "ws://example.test/ws/playback?ticket=ticket",
    };
  }

  async connect(): Promise<Response> {
    return new Response("switching", { status: 101 });
  }

  async publish(event: PlaybackRealtimeEvent): Promise<void> {
    this.publishedEvents.push(event);
  }
}

function createInMemoryRepositories(): ServerRepositories {
  let subscriptions: SubscriptionRecord[] = [];
  let playbackHistory: PlaybackCheckpointSyncRecord[] = [];
  let currentPlayback: CurrentPlaybackSyncRecord | null = null;
  let preferences: SyncPreferences | null = null;

  return {
    currentPlayback: {
      async clear() {
        currentPlayback = null;
      },
      async get() {
        return currentPlayback;
      },
      async set(record) {
        currentPlayback = record;
      },
    },
    playbackCheckpoints: {
      async list() {
        return [...playbackHistory];
      },
      async upsert(record) {
        playbackHistory = playbackHistory.filter(
          (existing) =>
            existing.locator.audioUrl !== record.locator.audioUrl ||
            existing.locator.feedUrl !== record.locator.feedUrl ||
            existing.locator.episodeGuid !== record.locator.episodeGuid,
        );
        playbackHistory.push(record);
      },
    },
    subscriptions: {
      async list() {
        return [...subscriptions];
      },
      async upsert(record) {
        subscriptions = subscriptions.filter((existing) => existing.feedUrl !== record.feedUrl);
        subscriptions.push(record);
      },
    },
    syncPreferences: {
      async get() {
        return preferences;
      },
      async set(record) {
        preferences = record;
      },
    },
  };
}

function createTestServer() {
  const realtime = new TestRealtimeCoordinator();
  const repositories = createInMemoryRepositories();
  const syncService = new SyncService(repositories, realtime);
  const app = createApp({
    authGuard: new TestAuthGuard(),
    realtimeCoordinator: realtime,
    syncService,
    version: "test",
  });

  return { app, realtime };
}

test("GET /api/meta returns the portable server metadata", async () => {
  const { app } = createTestServer();
  const response = await app.request("http://example.test/api/meta");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(await response.json(), {
    appVersion: "test",
    protocolVersion: "1",
    realtime: true,
  });
});

test("authenticated sync routes reject missing bearer tokens", async () => {
  const { app } = createTestServer();
  const response = await app.request("http://example.test/api/sync/state");

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
});

test("authenticated sync routes answer CORS preflight", async () => {
  const { app } = createTestServer();
  const response = await app.request("http://example.test/api/sync/state", {
    headers: {
      "Access-Control-Request-Headers": "authorization,content-type",
      "Access-Control-Request-Method": "GET",
      Origin: "http://localhost:3000",
    },
    method: "OPTIONS",
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET, POST, PUT, OPTIONS");
});

test("bootstrap merges subscriptions and preferences, then state is readable", async () => {
  const { app } = createTestServer();
  const response = await app.request("http://example.test/api/sync/bootstrap", {
    body: JSON.stringify({
      currentPlayback: null,
      deviceId: "device-a",
      playbackHistory: [],
      preferences: {
        autoPlay: true,
        itunesSearchEnabled: true,
        skipInterval: 45,
        updatedAt: "2026-04-18T00:00:00.000Z",
        whatsNewCount: 12,
      },
      subscriptions: [
        {
          deletedAt: null,
          feedUrl: "https://feed.example/rss.xml",
          status: "active",
          subscribedAt: "2026-04-18T00:00:00.000Z",
          updatedAt: "2026-04-18T00:00:00.000Z",
        },
      ],
    }),
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  assert.equal(response.status, 200);
  const state = (await response.json()) as SyncStateResponse;
  assert.equal(state.subscriptions.length, 1);
  assert.equal(state.subscriptions[0].feedUrl, "https://feed.example/rss.xml");
  assert.equal(state.preferences.skipInterval, 45);
  assert.equal(state.preferences.whatsNewCount, 12);
});

test("checkpoint updates state and publishes realtime events", async () => {
  const { app, realtime } = createTestServer();
  const checkpointResponse = await app.request("http://example.test/api/sync/playback/checkpoint", {
    body: JSON.stringify({
      checkpoint: {
        currentTime: 120,
        duration: 240,
        isCompleted: false,
        lastPlayedAt: "2026-04-18T00:00:00.000Z",
        locator: {
          audioUrl: "https://cdn.example/episode.mp3",
          episodeGuid: "episode-guid",
          feedUrl: "https://feed.example/rss.xml",
        },
        updatedAt: "2026-04-18T00:00:00.000Z",
      },
      deviceId: "device-a",
    }),
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  assert.equal(checkpointResponse.status, 204);

  const stateResponse = await app.request("http://example.test/api/sync/state", {
    headers: {
      Authorization: "Bearer test-token",
    },
  });

  assert.equal(stateResponse.status, 200);
  const state = (await stateResponse.json()) as SyncStateResponse;
  assert.equal(state.currentPlayback?.sourceDeviceId, "device-a");
  assert.equal(state.playbackHistory.length, 1);
  assert.equal(realtime.publishedEvents.length, 1);
  assert.equal(realtime.publishedEvents[0].type, "playback.updated");
});
