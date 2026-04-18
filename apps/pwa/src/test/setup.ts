import "fake-indexeddb/auto";

import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });

  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });

  if (!("crypto" in globalThis)) {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: () => "test-device-id",
      },
    });
  }
});

afterEach(async () => {
  const [
    { resetDatabaseForTests },
    { resetPodcastStoreForTests },
    { resetSyncBackendStoreForTests },
  ] = await Promise.all([
    import("@/lib/database"),
    import("@/lib/store"),
    import("@/lib/sync/store"),
  ]);

  await resetDatabaseForTests();
  resetPodcastStoreForTests();
  resetSyncBackendStoreForTests();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
