import {
  SYNC_PROTOCOL_VERSION,
  type BootstrapSyncRequest,
  type ClearCurrentPlaybackRequest,
  type PlaybackCheckpointRequest,
  type RealtimeTicketRequest,
  type ServerMetaResponse,
  type SubscriptionMutationRequest,
  type UpdatePreferencesRequest,
} from "@pgcast/contracts";
import { Hono } from "hono";

import type { AuthGuard } from "../../core/auth";
import { BadRequestError, HttpError, UnauthorizedError } from "../../core/errors";
import type { RealtimeCoordinator } from "../../core/realtime";
import { SyncService } from "../../core/sync-service";

interface CreateAppOptions {
  authGuard: AuthGuard;
  deploymentHint?: string;
  realtimeCoordinator: RealtimeCoordinator;
  syncService: SyncService;
  version: string;
}

export function createApp(options: CreateAppOptions) {
  const app = new Hono();

  app.get("/healthz", (c) => c.text("ok"));

  app.get("/api/meta", (c) =>
    c.json<ServerMetaResponse>({
      appVersion: options.version,
      deploymentHint: options.deploymentHint,
      protocolVersion: SYNC_PROTOCOL_VERSION,
      realtime: true,
    }),
  );

  app.use("/api/sync/*", async (c, next) => {
    await options.authGuard.authorize(c.req.raw);
    await next();
  });

  app.use("/api/realtime-ticket", async (c, next) => {
    await options.authGuard.authorize(c.req.raw);
    await next();
  });

  app.get("/api/sync/state", async (c) => c.json(await options.syncService.getState()));

  app.post("/api/sync/bootstrap", async (c) => {
    const body = await readJson<BootstrapSyncRequest>(c.req.raw);
    return c.json(await options.syncService.bootstrap(body));
  });

  app.post("/api/sync/subscriptions/upsert", async (c) => {
    const body = await readJson<SubscriptionMutationRequest>(c.req.raw);
    await options.syncService.upsertSubscription(body.feedUrl);
    return c.body(null, 204);
  });

  app.post("/api/sync/subscriptions/delete", async (c) => {
    const body = await readJson<SubscriptionMutationRequest>(c.req.raw);
    await options.syncService.deleteSubscription(body.feedUrl);
    return c.body(null, 204);
  });

  app.post("/api/sync/playback/checkpoint", async (c) => {
    const body = await readJson<PlaybackCheckpointRequest>(c.req.raw);
    await options.syncService.saveCheckpoint(body);
    return c.body(null, 204);
  });

  app.post("/api/sync/playback/clear-current", async (c) => {
    const body = await readJson<ClearCurrentPlaybackRequest>(c.req.raw);
    await options.syncService.clearCurrentPlayback(body);
    return c.body(null, 204);
  });

  app.put("/api/sync/preferences", async (c) => {
    const body = await readJson<UpdatePreferencesRequest>(c.req.raw);
    return c.json(await options.syncService.updatePreferences(body));
  });

  app.post("/api/realtime-ticket", async (c) => {
    const body = await readJson<RealtimeTicketRequest>(c.req.raw);
    if (!body.deviceId?.trim()) {
      throw new BadRequestError("deviceId is required");
    }

    return c.json(
      await options.realtimeCoordinator.issueTicket({
        baseUrl: c.req.url,
        deviceId: body.deviceId.trim(),
      }),
    );
  });

  app.get("/ws/playback", async (c) => {
    const ticket = c.req.query("ticket");
    if (!ticket) {
      throw new UnauthorizedError("Missing realtime ticket");
    }

    return options.realtimeCoordinator.connect(c.req.raw, ticket);
  });

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("Unhandled server error", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  });

  return app;
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
}
