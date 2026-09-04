import { describe, expect, it, vi } from "vitest";

import { CloudflareRealtimeCoordinator } from "./realtime-coordinator";

describe("CloudflareRealtimeCoordinator", () => {
  it("issues signed tickets with protocol-aware websocket URLs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00.000Z"));

    const coordinator = new CloudflareRealtimeCoordinator(createEnv());

    const httpsTicket = await coordinator.issueTicket({
      baseUrl: "https://api.example.test/api/realtime-ticket",
      deviceId: "device-a",
    });
    const httpTicket = await coordinator.issueTicket({
      baseUrl: "http://api.example.test/api/realtime-ticket",
      deviceId: "device-a",
    });

    expect(httpsTicket.ticket).toContain(".");
    expect(httpsTicket.expiresAt).toBe("2026-04-18T12:01:00.000Z");
    expect(httpsTicket.wsUrl).toMatch(/^wss:\/\/api\.example\.test\/ws\/playback\?ticket=/);
    expect(httpTicket.wsUrl).toMatch(/^ws:\/\/api\.example\.test\/ws\/playback\?ticket=/);

    vi.useRealTimers();
  });

  it("rejects invalid websocket tickets", async () => {
    const coordinator = new CloudflareRealtimeCoordinator(createEnv());

    await expect(
      coordinator.connect(new Request("https://api.example.test/ws/playback"), "not-a-ticket"),
    ).rejects.toThrow("Invalid or expired realtime ticket");
  });

  it("rejects expired websocket tickets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00.000Z"));

    const coordinator = new CloudflareRealtimeCoordinator(createEnv());
    const { ticket } = await coordinator.issueTicket({
      baseUrl: "https://api.example.test/api/realtime-ticket",
      deviceId: "device-a",
    });

    vi.setSystemTime(new Date("2026-04-18T12:01:01.000Z"));

    await expect(
      coordinator.connect(new Request("https://api.example.test/ws/playback"), ticket),
    ).rejects.toThrow("Invalid or expired realtime ticket");

    vi.useRealTimers();
  });

  it("forwards valid websocket requests with the ticket device id", async () => {
    const forwardedUrls: string[] = [];
    const coordinator = new CloudflareRealtimeCoordinator(
      createEnv({
        async fetch(request: Request) {
          forwardedUrls.push(request.url);
          return new Response("ok", { status: 200 });
        },
      }),
    );
    const { ticket } = await coordinator.issueTicket({
      baseUrl: "https://api.example.test/api/realtime-ticket",
      deviceId: "device-a",
    });

    const response = await coordinator.connect(
      new Request("https://api.example.test/ws/playback?ticket=redacted"),
      ticket,
    );

    expect(response.status).toBe(200);
    expect(forwardedUrls[0]).toBe(
      "https://api.example.test/ws/playback?ticket=redacted&deviceId=device-a",
    );
  });

  it("publishes realtime events through the playback coordinator", async () => {
    const events: unknown[] = [];
    const coordinator = new CloudflareRealtimeCoordinator(
      createEnv({
        async broadcast(event: unknown) {
          events.push(event);
        },
      }),
    );

    await coordinator.publish({
      checkpoint: null,
      currentPlayback: null,
      type: "playback.cleared",
    });

    expect(events).toEqual([
      {
        checkpoint: null,
        currentPlayback: null,
        type: "playback.cleared",
      },
    ]);
  });
});

function createEnv(stubOverrides: Record<string, unknown> = {}) {
  const stub = {
    async broadcast() {},
    async fetch() {
      return new Response("ok");
    },
    ...stubOverrides,
  };

  return {
    PGCAST_REALTIME_TICKET_SECRET: "test-secret",
    PLAYBACK_COORDINATOR: {
      getByName() {
        return stub;
      },
    },
  } as never;
}
