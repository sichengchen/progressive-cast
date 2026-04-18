import type {
  PlaybackCheckpointRequest,
  ServerMetaResponse,
  SubscriptionMutationRequest,
  UpdatePreferencesRequest,
} from "@pgcast/contracts";

export type SyncConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "syncing";

export interface SyncBackendConfigState {
  backendUrl: string;
  apiToken: string;
  deviceId: string;
  connectionStatus: SyncConnectionStatus;
  error: string | null;
  initialSyncCompleted: boolean;
  lastValidatedAt: string | null;
  serverMeta: ServerMetaResponse | null;
}

export type SyncOutboxItem =
  | {
      id: string;
      kind: "subscription-upsert" | "subscription-delete";
      payload: SubscriptionMutationRequest;
      updatedAt: Date;
    }
  | {
      id: string;
      kind: "playback-checkpoint";
      payload: PlaybackCheckpointRequest;
      updatedAt: Date;
    }
  | {
      id: string;
      kind: "playback-clear-current";
      payload: { deviceId: string };
      updatedAt: Date;
    }
  | {
      id: string;
      kind: "preferences-put";
      payload: UpdatePreferencesRequest;
      updatedAt: Date;
    };
