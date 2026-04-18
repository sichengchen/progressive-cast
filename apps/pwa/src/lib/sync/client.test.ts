import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSyncClient, validateBackendUrl } from "./client";

describe("SyncClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes backend urls and enforces secure remote endpoints", () => {
    expect(validateBackendUrl(" https://sync.example.com/ ")).toBe("https://sync.example.com");
    expect(validateBackendUrl("http://127.0.0.1:8788/")).toBe("http://127.0.0.1:8788");
    expect(() => validateBackendUrl("")).toThrow("Backend endpoint is required.");
    expect(() => validateBackendUrl("http://sync.example.com")).toThrow(
      "Use an HTTPS endpoint, or localhost/127.0.0.1 over HTTP for local development.",
    );
  });

  it("fetches server metadata without auth and validates the sync protocol", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          appVersion: "0.9.0",
          protocolVersion: "1",
          realtime: true,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      ),
    );

    const client = createSyncClient({
      apiToken: "secret-token",
      backendUrl: "https://sync.example.com",
    });
    const meta = await client.getMeta();

    expect(meta).toMatchObject({
      appVersion: "0.9.0",
      protocolVersion: "1",
      realtime: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const request = vi.mocked(fetch).mock.calls[0];
    expect(request?.[0]).toBe("https://sync.example.com/api/meta");
    const headers = new Headers(request?.[1]?.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("sends authorized JSON requests and surfaces API error payloads", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Token rejected" }), {
          headers: {
            "Content-Type": "application/json",
          },
          status: 401,
          statusText: "Unauthorized",
        }),
      );

    const client = createSyncClient({
      apiToken: "secret-token",
      backendUrl: "https://sync.example.com",
    });

    await client.saveCheckpoint({
      checkpoint: {
        currentTime: 90,
        duration: 300,
        isCompleted: false,
        lastPlayedAt: "2026-04-18T10:00:00.000Z",
        locator: {
          audioUrl: "https://cdn.example/episode.mp3",
          episodeGuid: "episode-guid",
          feedUrl: "https://feed.example/rss.xml",
        },
        updatedAt: "2026-04-18T10:00:00.000Z",
      },
      deviceId: "device-a",
    });

    const checkpointRequest = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(checkpointRequest?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(checkpointRequest?.[1]?.method).toBe("POST");

    await expect(client.getState()).rejects.toThrow("Token rejected");
  });
});
