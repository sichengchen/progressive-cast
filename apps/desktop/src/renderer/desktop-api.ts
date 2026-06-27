import type { NewcastleApi } from "../shared/ipc";

const missingDesktopServices = () => Promise.reject(new Error("Desktop services unavailable."));

const browserFallbackApi: NewcastleApi = {
  downloads: {
    delete: () => missingDesktopServices(),
    start: () => missingDesktopServices(),
  },
  episodes: {
    listAll: () => Promise.resolve([]),
    listLatest: () => Promise.resolve({ episodes: [], hasMore: false, nextOffset: 0 }),
    listByPodcast: () => Promise.resolve([]),
    listByPodcastPage: () => Promise.resolve({ episodes: [], hasMore: false, nextOffset: 0 }),
  },
  library: {
    list: () => Promise.resolve([]),
    refresh: () => missingDesktopServices(),
    subscribe: () => missingDesktopServices(),
    unsubscribe: () => missingDesktopServices(),
  },
  playback: {
    getSource: () => missingDesktopServices(),
    saveProgress: () => Promise.resolve(),
  },
  settings: {
    get: () => Promise.resolve({}),
    set: () => missingDesktopServices(),
  },
  sync: {
    now: () => missingDesktopServices(),
  },
};

export const desktopApi = window.newcastle ?? browserFallbackApi;
