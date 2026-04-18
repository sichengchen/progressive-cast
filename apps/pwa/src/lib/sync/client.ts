import {
  normalizeBackendUrl,
  SYNC_PROTOCOL_VERSION,
  type BootstrapSyncRequest,
  type ClearCurrentPlaybackRequest,
  type PlaybackCheckpointRequest,
  type RealtimeTicketRequest,
  type RealtimeTicketResponse,
  type ServerMetaResponse,
  type SubscriptionMutationRequest,
  type SyncPreferences,
  type SyncStateResponse,
} from "@pgcast/contracts";

interface SyncClientConfig {
  apiToken: string;
  backendUrl: string;
}

export class SyncClient {
  constructor(private readonly config: SyncClientConfig) {}

  async getMeta(): Promise<ServerMetaResponse> {
    const meta = await this.request<ServerMetaResponse>("/api/meta", {
      auth: false,
      method: "GET",
    });

    if (meta.protocolVersion !== SYNC_PROTOCOL_VERSION) {
      throw new Error(
        `Incompatible sync protocol. Expected ${SYNC_PROTOCOL_VERSION}, got ${meta.protocolVersion}.`,
      );
    }

    return meta;
  }

  async getState(): Promise<SyncStateResponse> {
    return this.request<SyncStateResponse>("/api/sync/state", { method: "GET" });
  }

  async bootstrap(payload: BootstrapSyncRequest): Promise<SyncStateResponse> {
    return this.request<SyncStateResponse>("/api/sync/bootstrap", {
      body: payload,
      method: "POST",
    });
  }

  async upsertSubscription(payload: SubscriptionMutationRequest): Promise<void> {
    await this.request<void>("/api/sync/subscriptions/upsert", {
      body: payload,
      method: "POST",
    });
  }

  async deleteSubscription(payload: SubscriptionMutationRequest): Promise<void> {
    await this.request<void>("/api/sync/subscriptions/delete", {
      body: payload,
      method: "POST",
    });
  }

  async saveCheckpoint(payload: PlaybackCheckpointRequest): Promise<void> {
    await this.request<void>("/api/sync/playback/checkpoint", {
      body: payload,
      method: "POST",
    });
  }

  async clearCurrentPlayback(payload: ClearCurrentPlaybackRequest): Promise<void> {
    await this.request<void>("/api/sync/playback/clear-current", {
      body: payload,
      method: "POST",
    });
  }

  async updatePreferences(preferences: SyncPreferences): Promise<SyncPreferences> {
    return this.request<SyncPreferences>("/api/sync/preferences", {
      body: { preferences },
      method: "PUT",
    });
  }

  async createRealtimeTicket(payload: RealtimeTicketRequest): Promise<RealtimeTicketResponse> {
    return this.request<RealtimeTicketResponse>("/api/realtime-ticket", {
      body: payload,
      method: "POST",
    });
  }

  private async request<T>(
    path: string,
    init: {
      auth?: boolean;
      body?: unknown;
      method: string;
    },
  ): Promise<T> {
    const headers = new Headers();

    if (init.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (init.auth !== false) {
      headers.set("Authorization", `Bearer ${this.config.apiToken}`);
    }

    const response = await fetch(`${this.config.backendUrl}${path}`, {
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      headers,
      method: init.method,
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

export function createSyncClient(config: SyncClientConfig): SyncClient {
  return new SyncClient({
    apiToken: config.apiToken.trim(),
    backendUrl: validateBackendUrl(config.backendUrl),
  });
}

export function validateBackendUrl(input: string): string {
  const normalized = normalizeBackendUrl(input);
  if (!normalized) {
    throw new Error("Backend endpoint is required.");
  }

  const parsed = new URL(normalized);
  const localDevHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const currentProtocol =
    typeof window !== "undefined" ? window.location.protocol : globalThis.location?.protocol;
  const productionPage = currentProtocol === "https:";

  if (parsed.protocol !== "https:" && !(localDevHost && parsed.protocol === "http:")) {
    throw new Error(
      "Use an HTTPS endpoint, or localhost/127.0.0.1 over HTTP for local development.",
    );
  }

  if (productionPage && parsed.protocol !== "https:" && !localDevHost) {
    throw new Error("The configured sync backend must use HTTPS.");
  }

  return normalized;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) {
      return data.error;
    }
  } catch {
    // Ignore invalid JSON bodies and fall back to status text.
  }

  return response.statusText || `Request failed with status ${response.status}`;
}
