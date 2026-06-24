import { create } from "zustand";

interface SyncBackendStore {
  apiToken: string;
  backendUrl: string;
  connectionStatus: "connected" | "disconnected" | "error" | "syncing";
  lastValidatedAt?: string;
  setConnection: (data: {
    apiToken: string;
    backendUrl: string;
    connectionStatus: SyncBackendStore["connectionStatus"];
    lastValidatedAt?: string;
  }) => void;
}

export const useSyncBackendStore = create<SyncBackendStore>((set) => ({
  apiToken: "",
  backendUrl: "",
  connectionStatus: "disconnected",
  lastValidatedAt: undefined,
  setConnection: (data) => set(data),
}));
