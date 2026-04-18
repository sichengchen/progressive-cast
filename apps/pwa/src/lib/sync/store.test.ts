import { describe, expect, it } from "vitest";

import {
  hasSyncBackendConfigured,
  resetSyncBackendStoreForTests,
  useSyncBackendStore,
} from "./store";

describe("useSyncBackendStore", () => {
  it("stores credentials and reports whether sync is configured", () => {
    resetSyncBackendStoreForTests();

    useSyncBackendStore.getState().setCredentials(" https://sync.example.com/ ", " secret-token ");

    expect(hasSyncBackendConfigured()).toBe(true);
    expect(useSyncBackendStore.getState()).toMatchObject({
      apiToken: " secret-token ",
      backendUrl: " https://sync.example.com/ ",
      connectionStatus: "disconnected",
      error: null,
      initialSyncCompleted: false,
    });
  });

  it("clears configuration while preserving the device identity", () => {
    resetSyncBackendStoreForTests();

    const { deviceId } = useSyncBackendStore.getState();
    useSyncBackendStore.getState().setCredentials("https://sync.example.com", "token");
    useSyncBackendStore.setState({
      connectionStatus: "error",
      error: "boom",
      initialSyncCompleted: true,
    });

    useSyncBackendStore.getState().clearConfiguration();

    expect(useSyncBackendStore.getState()).toMatchObject({
      apiToken: "",
      backendUrl: "",
      connectionStatus: "disconnected",
      deviceId,
      error: null,
      initialSyncCompleted: false,
      lastValidatedAt: null,
      serverMeta: null,
    });
    expect(hasSyncBackendConfigured()).toBe(false);
  });
});
