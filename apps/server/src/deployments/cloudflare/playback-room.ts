import type { PlaybackRealtimeEvent } from "@pgcast/contracts";
import { DurableObject } from "cloudflare:workers";

import type { CloudflareBindings } from "./env";

interface ConnectionAttachment {
  deviceId: string;
}

export class PlaybackRoomDurableObject extends DurableObject<CloudflareBindings> {
  async broadcast(event: PlaybackRealtimeEvent): Promise<void> {
    const payload = JSON.stringify(event);

    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as ConnectionAttachment | null;
      if (
        event.currentPlayback?.sourceDeviceId &&
        attachment?.deviceId === event.currentPlayback.sourceDeviceId
      ) {
        continue;
      }

      try {
        socket.send(payload);
      } catch (error) {
        console.warn("Failed to send realtime playback update", error);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const deviceId = url.searchParams.get("deviceId") ?? "unknown-device";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ deviceId });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
