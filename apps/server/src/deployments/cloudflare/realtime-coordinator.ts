import type { PlaybackRealtimeEvent, RealtimeTicketResponse } from "@pgcast/contracts";

import type { RealtimeCoordinator } from "../../core/realtime";
import { UnauthorizedError } from "../../core/errors";
import type { CloudflareBindings } from "./env";

interface RealtimeTicketPayload {
  deviceId: string;
  expiresAt: number;
}

const REALTIME_TICKET_TTL_MS = 60_000;

export class CloudflareRealtimeCoordinator implements RealtimeCoordinator {
  constructor(private readonly env: CloudflareBindings) {}

  async issueTicket(input: { baseUrl: string; deviceId: string }): Promise<RealtimeTicketResponse> {
    const expiresAt = Date.now() + REALTIME_TICKET_TTL_MS;
    const payload: RealtimeTicketPayload = {
      deviceId: input.deviceId,
      expiresAt,
    };
    const ticket = await signTicket(payload, this.env.PGCAST_REALTIME_TICKET_SECRET);
    const baseUrl = new URL(input.baseUrl);
    const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${baseUrl.host}/ws/playback?ticket=${encodeURIComponent(ticket)}`;

    return {
      expiresAt: new Date(expiresAt).toISOString(),
      ticket,
      wsUrl,
    };
  }

  async connect(request: Request, ticket: string): Promise<Response> {
    const payload = await verifyTicket(ticket, this.env.PGCAST_REALTIME_TICKET_SECRET);
    if (!payload || payload.expiresAt < Date.now()) {
      throw new UnauthorizedError("Invalid or expired realtime ticket");
    }

    const stub = this.env.PLAYBACK_COORDINATOR.getByName("singleton");
    const url = new URL(request.url);
    url.searchParams.set("deviceId", payload.deviceId);

    return stub.fetch(new Request(url.toString(), request));
  }

  async publish(event: PlaybackRealtimeEvent): Promise<void> {
    const stub = this.env.PLAYBACK_COORDINATOR.getByName("singleton");
    await stub.broadcast(event);
  }
}

async function signTicket(payload: RealtimeTicketPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyTicket(ticket: string, secret: string): Promise<RealtimeTicketPayload | null> {
  const [payloadPart, signaturePart] = ticket.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const key = await importHmacKey(secret);
  const encoder = new TextEncoder();
  const signature = base64UrlDecode(signaturePart);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    bytesToArrayBuffer(signature),
    encoder.encode(payloadPart),
  );

  if (!valid) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadPart));
    return JSON.parse(json) as RealtimeTicketPayload;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let encoded = "";
  for (const byte of bytes) {
    encoded += String.fromCharCode(byte);
  }

  return btoa(encoded).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const decoded = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
