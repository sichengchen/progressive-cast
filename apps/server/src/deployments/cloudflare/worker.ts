import { createApp } from "../../adapters/http/create-app";
import {
  createDrizzleServerRepositories,
  createSyncDatabase,
} from "../../adapters/storage/drizzle/repositories";
import { StaticBearerAuthGuard } from "../../core/auth";
import { SyncService } from "../../core/sync-service";
import { CloudflareRealtimeCoordinator } from "./realtime-coordinator";
import type { CloudflareBindings } from "./env";

export { PlaybackRoomDurableObject } from "./playback-room";

const APP_VERSION = "0.1.0";
const DEPLOYMENT_HINT =
  "Cloudflare Workers + D1 + Durable Objects is the reference deployment. The sync API itself is infrastructure-agnostic.";

export default {
  async fetch(request: Request, env: CloudflareBindings): Promise<Response> {
    const db = createSyncDatabase(env.DB);
    const repositories = createDrizzleServerRepositories(db);
    const realtimeCoordinator = new CloudflareRealtimeCoordinator(env);
    const authGuard = new StaticBearerAuthGuard(env.PGCAST_API_TOKEN);
    const syncService = new SyncService(repositories, realtimeCoordinator);
    const app = createApp({
      authGuard,
      deploymentHint: DEPLOYMENT_HINT,
      realtimeCoordinator,
      syncService,
      version: APP_VERSION,
    });

    return app.fetch(request, env);
  },
};
