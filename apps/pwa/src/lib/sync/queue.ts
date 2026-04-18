import {
  createSyncLocatorKey,
  type PlaybackCheckpointRequest,
  type SyncPreferences,
} from "@pgcast/contracts";

import { DatabaseService } from "@/lib/database";
import type { Episode, Podcast } from "@/lib/types";

import { createSyncClient } from "./client";
import { hasSyncBackendConfigured, useSyncBackendStore } from "./store";
import type { SyncOutboxItem } from "./types";

let flushPromise: Promise<void> | null = null;

export function isRemoteSyncEnabled(): boolean {
  const state = useSyncBackendStore.getState();
  return hasSyncBackendConfigured() && state.initialSyncCompleted;
}

export async function enqueueSubscriptionUpsert(feedUrl: string): Promise<void> {
  if (!isRemoteSyncEnabled()) {
    return;
  }

  await DatabaseService.putSyncOutboxItem({
    id: `subscription-upsert:${feedUrl}`,
    kind: "subscription-upsert",
    payload: { feedUrl },
    updatedAt: new Date(),
  });
  void flushSyncOutbox();
}

export async function enqueueSubscriptionDelete(feedUrl: string): Promise<void> {
  if (!isRemoteSyncEnabled()) {
    return;
  }

  await DatabaseService.putSyncOutboxItem({
    id: `subscription-delete:${feedUrl}`,
    kind: "subscription-delete",
    payload: { feedUrl },
    updatedAt: new Date(),
  });
  void flushSyncOutbox();
}

export async function enqueuePreferencesSync(preferences: SyncPreferences): Promise<void> {
  if (!isRemoteSyncEnabled()) {
    return;
  }

  await DatabaseService.putSyncOutboxItem({
    id: "preferences-put",
    kind: "preferences-put",
    payload: { preferences },
    updatedAt: new Date(),
  });
  void flushSyncOutbox();
}

export async function enqueuePlaybackCheckpoint(input: {
  currentTime: number;
  duration: number;
  episode: Episode;
  isCompleted: boolean;
  podcast: Podcast;
}): Promise<void> {
  if (!isRemoteSyncEnabled()) {
    return;
  }

  const { deviceId } = useSyncBackendStore.getState();
  const payload: PlaybackCheckpointRequest = {
    checkpoint: {
      currentTime: input.currentTime,
      duration: input.duration,
      isCompleted: input.isCompleted,
      lastPlayedAt: new Date().toISOString(),
      locator: {
        audioUrl: input.episode.audioUrl,
        episodeGuid: input.episode.guid,
        feedUrl: input.podcast.feedUrl,
      },
      updatedAt: new Date().toISOString(),
    },
    deviceId,
  };

  await DatabaseService.putSyncOutboxItem({
    id: `playback-checkpoint:${createSyncLocatorKey(payload.checkpoint.locator)}`,
    kind: "playback-checkpoint",
    payload,
    updatedAt: new Date(),
  });
  void flushSyncOutbox();
}

export async function enqueueCurrentPlaybackClear(): Promise<void> {
  if (!isRemoteSyncEnabled()) {
    return;
  }

  await DatabaseService.putSyncOutboxItem({
    id: "playback-clear-current",
    kind: "playback-clear-current",
    payload: { deviceId: useSyncBackendStore.getState().deviceId },
    updatedAt: new Date(),
  });
  void flushSyncOutbox();
}

export async function flushSyncOutbox(): Promise<void> {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = flushSyncOutboxInternal().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

async function flushSyncOutboxInternal(): Promise<void> {
  if (!hasSyncBackendConfigured()) {
    return;
  }

  const state = useSyncBackendStore.getState();
  const client = createSyncClient({
    apiToken: state.apiToken,
    backendUrl: state.backendUrl,
  });
  const outbox = await DatabaseService.getSyncOutboxItems();

  if (outbox.length === 0) {
    return;
  }

  useSyncBackendStore.setState({
    connectionStatus: "syncing",
    error: null,
  });

  for (const item of outbox) {
    try {
      await dispatchOutboxItem(client, item);
      await DatabaseService.deleteSyncOutboxItem(item.id);
    } catch (error) {
      useSyncBackendStore.setState({
        connectionStatus: "error",
        error: error instanceof Error ? error.message : "Failed to flush the sync queue.",
      });
      throw error;
    }
  }

  useSyncBackendStore.setState({
    connectionStatus: "connected",
    error: null,
  });
}

async function dispatchOutboxItem(
  client: ReturnType<typeof createSyncClient>,
  item: SyncOutboxItem,
) {
  switch (item.kind) {
    case "subscription-upsert":
      await client.upsertSubscription(item.payload);
      return;
    case "subscription-delete":
      await client.deleteSubscription(item.payload);
      return;
    case "playback-checkpoint":
      await client.saveCheckpoint(item.payload);
      return;
    case "playback-clear-current":
      await client.clearCurrentPlayback(item.payload);
      return;
    case "preferences-put":
      await client.updatePreferences(item.payload.preferences);
      return;
  }
}
