import "fake-indexeddb/auto";

import { afterEach, beforeEach, vi } from "vitest";

function createMemoryStorage(): Storage {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    clear: () => {
      items.clear();
    },
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

const localStorageMock = createMemoryStorage();
const sessionStorageMock = createMemoryStorage();

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

Object.defineProperty(window, "sessionStorage", {
  configurable: true,
  value: sessionStorageMock,
});

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: sessionStorageMock,
});

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
