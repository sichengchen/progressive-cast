import { desktopApi } from "@/desktop-api";
import { useSyncBackendStore } from "@/lib/sync/store";

export async function initializeSync() {
  const settings = await desktopApi.settings.get();
  useSyncBackendStore.getState().setConnection({
    apiToken: settings.syncAuthToken ?? "",
    backendUrl: settings.syncBaseUrl ?? "",
    connectionStatus: settings.syncBaseUrl && settings.syncAuthToken ? "connected" : "disconnected",
  });
}

export async function connectSyncBackend(backendUrl: string, apiToken: string) {
  await desktopApi.settings.set({
    syncAuthToken: apiToken,
    syncBaseUrl: backendUrl,
  });
  useSyncBackendStore.getState().setConnection({
    apiToken,
    backendUrl,
    connectionStatus: "connected",
    lastValidatedAt: new Date().toISOString(),
  });
}

export function disconnectSyncBackend() {
  void desktopApi.settings.set({
    syncAuthToken: "",
    syncBaseUrl: "",
  });
  useSyncBackendStore.getState().setConnection({
    apiToken: "",
    backendUrl: "",
    connectionStatus: "disconnected",
  });
}

export async function syncNow() {
  useSyncBackendStore.setState({ connectionStatus: "syncing" });
  try {
    await desktopApi.sync.now();
    useSyncBackendStore.setState({
      connectionStatus: "connected",
      lastValidatedAt: new Date().toISOString(),
    });
  } catch (error) {
    useSyncBackendStore.setState({ connectionStatus: "error" });
    throw error;
  }
}
