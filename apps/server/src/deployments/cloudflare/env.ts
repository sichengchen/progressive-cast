import type { PlaybackRoomDurableObject } from "./playback-room";

export interface CloudflareBindings {
  DB: D1Database;
  PGCAST_API_TOKEN: string;
  PGCAST_REALTIME_TICKET_SECRET: string;
  PLAYBACK_COORDINATOR: DurableObjectNamespace<PlaybackRoomDurableObject>;
}
