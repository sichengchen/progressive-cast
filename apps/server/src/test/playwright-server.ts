import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { WebSocketServer } from "ws";

import { createApp } from "../adapters/http/create-app";
import type { RealtimeCoordinator } from "../core/realtime";
import { SyncService } from "../core/sync-service";
import { createInMemoryRepositories, TestAuthGuard } from "./test-harness";

const HTTP_PORT = 9131;
const WS_PORT = 9132;
const TEST_AUDIO_URL = `http://127.0.0.1:${HTTP_PORT}/audio.mp3`;

const wsClients = new Set<import("ws").WebSocket>();
const tickets = new Set<string>();

const realtimeCoordinator: RealtimeCoordinator = {
  async connect(): Promise<Response> {
    return new Response("Use the issued websocket URL directly.", { status: 400 });
  },
  async issueTicket(): Promise<{ expiresAt: string; ticket: string; wsUrl: string }> {
    const ticket = `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    tickets.add(ticket);
    return {
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      ticket,
      wsUrl: `ws://127.0.0.1:${WS_PORT}/playback?ticket=${ticket}`,
    };
  },
  async publish(event): Promise<void> {
    const payload = JSON.stringify(event);
    for (const client of wsClients) {
      if (client.readyState === 1) {
        client.send(payload);
      }
    }
  },
};

let currentRepositories = createInMemoryRepositories();
let currentSyncApp = createSyncHttpApp();

function createSyncHttpApp() {
  const syncService = new SyncService(currentRepositories, realtimeCoordinator);
  return createApp({
    authGuard: new TestAuthGuard(),
    realtimeCoordinator,
    syncService,
    version: "playwright",
  });
}

function resetState(): void {
  for (const client of wsClients) {
    client.close();
  }
  wsClients.clear();
  tickets.clear();
  currentRepositories = createInMemoryRepositories();
  currentSyncApp = createSyncHttpApp();
}

const app = new Hono();

app.post("/__reset", (c) => {
  resetState();
  return c.json({ ok: true });
});

app.get("/__stats", (c) =>
  c.json({
    tickets: tickets.size,
    wsConnections: wsClients.size,
  }),
);

app.get("/feed.xml", (c) =>
  c.body(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sync Test Podcast</title>
    <description>Podcast feed used for sync end-to-end tests.</description>
    <link>http://127.0.0.1:${HTTP_PORT}</link>
    <item>
      <title>Episode One</title>
      <description>Episode description</description>
      <guid>episode-guid-1</guid>
      <pubDate>Sat, 18 Apr 2026 09:00:00 GMT</pubDate>
      <enclosure url="${TEST_AUDIO_URL}" type="audio/mpeg" length="1" />
    </item>
  </channel>
</rss>`,
    200,
    {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  ),
);

app.get("/audio.mp3", (c) =>
  c.body(new Uint8Array([0]), 200, {
    "Content-Type": "audio/mpeg",
  }),
);

app.all("*", (c) => currentSyncApp.fetch(c.req.raw));

const wsServer = new WebSocketServer({
  host: "127.0.0.1",
  port: WS_PORT,
});

wsServer.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/playback", `ws://127.0.0.1:${WS_PORT}`);
  const ticket = url.searchParams.get("ticket");
  if (!ticket || !tickets.has(ticket)) {
    socket.close(1008, "Invalid ticket");
    return;
  }

  wsClients.add(socket);

  socket.on("close", () => {
    wsClients.delete(socket);
  });
});

serve(
  {
    fetch: app.fetch,
    port: HTTP_PORT,
  },
  () => {
    console.log(`Playwright sync server ready at http://127.0.0.1:${HTTP_PORT}`);
  },
);
