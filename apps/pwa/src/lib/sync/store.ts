import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SyncBackendConfigState, SyncConnectionStatus } from "./types";

interface SyncBackendStore extends SyncBackendConfigState {
  clearConfiguration: () => void;
  setConnectionStatus: (status: SyncConnectionStatus) => void;
  setCredentials: (backendUrl: string, apiToken: string) => void;
  setError: (error: string | null) => void;
  setInitialSyncCompleted: (value: boolean) => void;
  setValidated: (serverMeta: SyncBackendConfigState["serverMeta"], validatedAt: string) => void;
}

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}`;
}

const initialState: SyncBackendConfigState = {
  apiToken: "",
  backendUrl: "",
  connectionStatus: "disconnected",
  deviceId: createDeviceId(),
  error: null,
  initialSyncCompleted: false,
  lastValidatedAt: null,
  serverMeta: null,
};

export const useSyncBackendStore = create<SyncBackendStore>()(
  persist(
    (set) => ({
      ...initialState,
      clearConfiguration: () =>
        set((state) => ({
          ...initialState,
          deviceId: state.deviceId || createDeviceId(),
        })),
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
      setCredentials: (backendUrl, apiToken) =>
        set({
          apiToken,
          backendUrl,
          connectionStatus: "disconnected",
          error: null,
          initialSyncCompleted: false,
        }),
      setError: (error) => set({ error }),
      setInitialSyncCompleted: (initialSyncCompleted) => set({ initialSyncCompleted }),
      setValidated: (serverMeta, lastValidatedAt) =>
        set({
          lastValidatedAt,
          serverMeta,
        }),
    }),
    {
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SyncBackendStore> | undefined;
        return {
          ...currentState,
          ...persisted,
          connectionStatus: "disconnected",
          deviceId: persisted?.deviceId || createDeviceId(),
          error: null,
        };
      },
      name: "pgcast-sync-backend",
      partialize: (state) => ({
        apiToken: state.apiToken,
        backendUrl: state.backendUrl,
        deviceId: state.deviceId,
        initialSyncCompleted: state.initialSyncCompleted,
        lastValidatedAt: state.lastValidatedAt,
        serverMeta: state.serverMeta,
      }),
    },
  ),
);

export function hasSyncBackendConfigured(): boolean {
  const { apiToken, backendUrl } = useSyncBackendStore.getState();
  return Boolean(apiToken.trim() && backendUrl.trim());
}
