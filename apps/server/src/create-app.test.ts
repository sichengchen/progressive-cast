import { describe, expect, it } from "vitest";
import type { SyncStateResponse } from "@pgcast/contracts";
import { createTestServer } from "./test/test-harness";

describe("createApp", () => {
  it("GET /api/meta returns the portable server metadata", async () => {
    const { app } = createTestServer();
    const response = await app.request("http://example.test/api/meta");

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    await expect(response.json()).resolves.toEqual({
      appVersion: "test",
      protocolVersion: "1",
      realtime: true,
    });
  });

  it("authenticated sync routes reject missing bearer tokens", async () => {
    const { app } = createTestServer();
    const response = await app.request("http://example.test/api/sync/state");

    expect(response.status).toBe(401);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("authenticated sync routes answer CORS preflight", async () => {
    const { app } = createTestServer();
    const response = await app.request("http://example.test/api/sync/state", {
      headers: {
        "Access-Control-Request-Headers": "authorization,content-type",
        "Access-Control-Request-Method": "GET",
        Origin: "http://localhost:3000",
      },
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PUT, OPTIONS");
  });

  it("bootstrap merges subscriptions and preferences, then state is readable", async () => {
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

    expect(response.status).toBe(200);
    const state = (await response.json()) as SyncStateResponse;
    expect(state.subscriptions).toHaveLength(1);
    expect(state.subscriptions[0]?.feedUrl).toBe("https://feed.example/rss.xml");
    expect(state.preferences.skipInterval).toBe(45);
    expect(state.preferences.whatsNewCount).toBe(12);
  });

  it("checkpoint updates state and publishes realtime events", async () => {
    const { app, realtime } = createTestServer();
    const checkpointResponse = await app.request(
      "http://example.test/api/sync/playback/checkpoint",
      {
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
      },
    );

    expect(checkpointResponse.status).toBe(204);

    const stateResponse = await app.request("http://example.test/api/sync/state", {
      headers: {
        Authorization: "Bearer test-token",
      },
    });

    expect(stateResponse.status).toBe(200);
    const state = (await stateResponse.json()) as SyncStateResponse;
    expect(state.currentPlayback?.sourceDeviceId).toBe("device-a");
    expect(state.playbackHistory).toHaveLength(1);
    expect(realtime.publishedEvents).toHaveLength(1);
    expect(realtime.publishedEvents[0]?.type).toBe("playback.updated");
  });

  it("returns a structured 400 when sync routes receive invalid JSON", async () => {
    const { app } = createTestServer();
    const response = await app.request("http://example.test/api/sync/bootstrap", {
      body: "{not-json",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Request body must be valid JSON",
    });
  });

  it("subscription mutation endpoints update readable state", async () => {
    const { app } = createTestServer();

    const upsertResponse = await app.request("http://example.test/api/sync/subscriptions/upsert", {
      body: JSON.stringify({ feedUrl: " https://feed.example/rss.xml " }),
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(upsertResponse.status).toBe(204);

    const deleteResponse = await app.request("http://example.test/api/sync/subscriptions/delete", {
      body: JSON.stringify({ feedUrl: "https://feed.example/rss.xml" }),
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(deleteResponse.status).toBe(204);

    const stateResponse = await app.request("http://example.test/api/sync/state", {
      headers: {
        Authorization: "Bearer test-token",
      },
    });

    const state = (await stateResponse.json()) as SyncStateResponse;
    expect(state.subscriptions).toHaveLength(1);
    expect(state.subscriptions[0]).toMatchObject({
      feedUrl: "https://feed.example/rss.xml",
      status: "deleted",
    });
    expect(state.subscriptions[0]?.deletedAt).toBeTruthy();
  });

  it("preferences endpoint persists normalized settings", async () => {
    const { app } = createTestServer();
    const response = await app.request("http://example.test/api/sync/preferences", {
      body: JSON.stringify({
        preferences: {
          autoPlay: true,
          itunesSearchEnabled: false,
          skipInterval: 0,
          updatedAt: "2026-04-18T00:00:00.000Z",
          whatsNewCount: -4,
        },
      }),
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      method: "PUT",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      autoPlay: true,
      itunesSearchEnabled: false,
      skipInterval: 1,
      whatsNewCount: 1,
    });
  });
});
