import { create } from "zustand";

import { desktopApi } from "@/desktop-api";
import { preloadImageUrls } from "@/lib/image-preloader";
import type {
  DownloadProgress,
  Episode,
  PlaybackProgress,
  PlaybackState,
  Podcast,
  StorageStats,
  UserPreferences,
} from "@/lib/types";
import type { EpisodeSummary, PodcastSummary } from "../../shared/types";

const defaultPreferences: UserPreferences = {
  autoPlay: false,
  itunesSearchEnabled: true,
  skipInterval: 30,
  theme: "system",
  whatsNewCount: 10,
};

const episodeLoadPromises = new Map<string, Promise<Episode[]>>();

interface ProgressDialogState {
  currentItem: string;
  isOpen: boolean;
  progress: number;
  title: string;
  total: number;
}

interface PodcastStore {
  currentPage: "podcasts" | "whats-new" | "resume-playing" | "settings" | "downloaded" | "library";
  downloadedEpisodes: Episode[];
  downloadProgress: Map<string, DownloadProgress>;
  episodeCache: Map<string, Episode[]>;
  episodesHydrated: boolean;
  episodes: Episode[];
  error: string | null;
  isImporting: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  latestEpisodesCache: {
    count: number;
    episodes: Episode[];
    timestamp: number;
    version: number;
  } | null;
  latestEpisodesVersion: number;
  playbackProgress: Map<string, PlaybackProgress>;
  playbackState: PlaybackState;
  podcasts: Podcast[];
  preferences: UserPreferences;
  progressDialog: ProgressDialogState;
  selectedPodcastId: string | null;
  showAddPodcastDialog: boolean;
  showNotesOpen: boolean;
  storageStats: StorageStats | null;

  cancelDownload: (episodeId: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  clearError: () => void;
  clearLatestEpisodesCache: () => void;
  clearPlayback: () => void;
  clearSeekRequest: () => void;
  closeProgressDialog: () => void;
  deleteDownload: (episodeId: string) => Promise<void>;
  downloadEpisode: (episode: Episode) => Promise<void>;
  getDownloadedEpisodes: () => Promise<Episode[]>;
  getLatestEpisodes: () => Promise<Episode[]>;
  getUnfinishedEpisodes: () => Promise<Episode[]>;
  importFromOPML: (opmlContent: string) => Promise<{ errors: number; imported: number }>;
  initializeStore: () => Promise<void>;
  loadEpisodes: (podcastId: string) => Promise<void>;
  markEpisodeCompleted: (episodeId: string) => Promise<void>;
  pausePlayback: () => void;
  playEpisode: (episode: Episode) => void;
  refreshAllPodcasts: () => Promise<void>;
  refreshPodcast: (podcastId: string) => Promise<void>;
  refreshStorageStats: () => Promise<void>;
  resumePlayback: () => void;
  retryDownload: (episode: Episode) => Promise<void>;
  saveProgress: (episodeId: string, currentTime: number, duration: number) => Promise<void>;
  seekToTime: (time: number) => void;
  setAutoPlay: (autoPlay: boolean) => void;
  setCurrentPage: (
    page: "podcasts" | "whats-new" | "resume-playing" | "settings" | "downloaded" | "library",
  ) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setError: (error: string | null) => void;
  setItunesSearchEnabled: (enabled: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setProgressDialog: (data: Partial<ProgressDialogState> & { isOpen: boolean }) => void;
  setSelectedPodcast: (podcastId: string | null) => void;
  setShowAddPodcastDialog: (show: boolean) => void;
  setSkipInterval: (interval: number) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setVolume: (volume: number) => void;
  setWhatsNewCount: (count: number) => void;
  subscribeToPodcast: (feedUrl: string) => Promise<void>;
  toggleShowNotes: () => void;
  unsubscribeFromPodcast: (podcastId: string) => Promise<void>;
  updateDownloadProgress: (episodeId: string, progress: DownloadProgress) => void;
  updateProgress: (progress: number, currentItem?: string) => void;
}

export const usePodcastStore = create<PodcastStore>((set, get) => ({
  currentPage: "whats-new",
  downloadedEpisodes: [],
  downloadProgress: new Map(),
  episodeCache: new Map(),
  episodesHydrated: false,
  episodes: [],
  error: null,
  isImporting: false,
  isLoading: false,
  isRefreshing: false,
  latestEpisodesCache: null,
  latestEpisodesVersion: 0,
  playbackProgress: new Map(),
  playbackState: {
    currentEpisode: null,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    isPlaying: false,
    seekRequested: false,
    showNotes: "",
    volume: 1,
  },
  podcasts: [],
  preferences: defaultPreferences,
  progressDialog: {
    currentItem: "",
    isOpen: false,
    progress: 0,
    title: "",
    total: 0,
  },
  selectedPodcastId: null,
  showAddPodcastDialog: false,
  showNotesOpen: false,
  storageStats: null,

  cancelDownload: async (episodeId) => {
    const next = new Map(get().downloadProgress);
    next.delete(episodeId);
    set({ downloadProgress: next });
  },

  clearAllData: async () => {
    for (const podcast of get().podcasts) {
      await desktopApi.library.unsubscribe(podcast.id);
    }
    set({
      downloadedEpisodes: [],
      downloadProgress: new Map(),
      episodeCache: new Map(),
      episodesHydrated: true,
      episodes: [],
      latestEpisodesCache: null,
      latestEpisodesVersion: get().latestEpisodesVersion + 1,
      playbackProgress: new Map(),
      podcasts: [],
      selectedPodcastId: null,
    });
  },

  clearAllDownloads: async () => {
    for (const episode of get().downloadedEpisodes) {
      await desktopApi.downloads.delete(episode.id);
    }
    await get().refreshStorageStats();
    await get().getDownloadedEpisodes();
  },

  clearError: () => set({ error: null }),

  clearLatestEpisodesCache: () =>
    set((state) => ({
      latestEpisodesCache: null,
      latestEpisodesVersion: state.latestEpisodesVersion + 1,
    })),

  clearPlayback: () =>
    set((state) => ({
      playbackState: {
        ...state.playbackState,
        currentEpisode: null,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        showNotes: "",
      },
    })),

  clearSeekRequest: () =>
    set((state) => ({
      playbackState: { ...state.playbackState, seekRequested: false },
    })),

  closeProgressDialog: () =>
    set((state) => ({
      progressDialog: { ...state.progressDialog, isOpen: false },
    })),

  deleteDownload: async (episodeId) => {
    await desktopApi.downloads.delete(episodeId);
    await reloadSelectedEpisodes(set, get);
    await get().getDownloadedEpisodes();
  },

  downloadEpisode: async (episode) => {
    const progress: DownloadProgress = {
      episodeId: episode.id,
      progress: 0,
      startedAt: new Date(),
      status: "downloading",
    };
    get().updateDownloadProgress(episode.id, progress);
    await desktopApi.downloads.start(episode.id);
    get().updateDownloadProgress(episode.id, {
      ...progress,
      completedAt: new Date(),
      progress: 100,
      status: "completed",
    });
    await reloadSelectedEpisodes(set, get);
    await get().getDownloadedEpisodes();
  },

  getDownloadedEpisodes: async () => {
    const episodes = await loadEpisodesFromLibrary(set, get);
    const downloadedEpisodes = episodes.filter((episode) => episode.isDownloaded);
    set({ downloadedEpisodes });
    return downloadedEpisodes;
  },

  getLatestEpisodes: async () => {
    const count = get().preferences.whatsNewCount || 10;
    const cached = get().latestEpisodesCache;
    const cacheVersion = get().latestEpisodesVersion;
    if (
      cached &&
      cached.count === count &&
      cached.version === cacheVersion &&
      Date.now() - cached.timestamp < 60_000
    ) {
      return cached.episodes;
    }
    const episodes = await loadEpisodesFromLibrary(set, get);
    const version = get().latestEpisodesVersion;
    const latest = [...episodes]
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, count);
    set({ latestEpisodesCache: { count, episodes: latest, timestamp: Date.now(), version } });
    return latest;
  },

  getUnfinishedEpisodes: async () => {
    const progress = get().playbackProgress;
    const episodes = await loadEpisodesFromLibrary(set, get);
    return episodes.filter((episode) => {
      const entry = progress.get(episode.id);
      return entry && entry.currentTime > 0 && !entry.isCompleted;
    });
  },

  importFromOPML: async (opmlContent) => {
    set({ isImporting: true });
    const feeds = extractOpmlFeeds(opmlContent);
    const { closeProgressDialog, setProgressDialog, updateProgress } = get();

    if (feeds.length === 0) {
      set({ isImporting: false });
      throw new Error("No podcast feeds found in OPML file");
    }

    setProgressDialog({
      currentItem: "Preparing import...",
      isOpen: true,
      progress: 0,
      title: "Importing OPML Subscriptions",
      total: feeds.length,
    });

    let imported = 0;
    let errors = 0;

    try {
      for (const [index, feed] of feeds.entries()) {
        updateProgress(index + 1, feed.title);

        try {
          const existing = get().podcasts.find((podcast) => podcast.feedUrl === feed.feedUrl);
          if (existing) {
            continue;
          }

          await desktopApi.library.subscribe(feed.feedUrl);
          imported += 1;
        } catch (error) {
          console.error(`Failed to import podcast: ${feed.feedUrl}`, error);
          errors += 1;
        }
      }

      await get().initializeStore();
      return { errors, imported };
    } finally {
      closeProgressDialog();
      set({ isImporting: false });
    }
  },

  initializeStore: async () => {
    set({ isLoading: true });
    try {
      const podcasts = (await desktopApi.library.list()).map(toPodcast);
      const selectedPodcastId = selectPodcastId(get().selectedPodcastId, podcasts);
      set({ isLoading: false, podcasts, selectedPodcastId });
      warmPodcastCoverImages(podcasts);

      const allEpisodes = await listLibraryEpisodes(podcasts);
      const episodeCache = groupEpisodesByPodcast(allEpisodes, podcasts);
      const downloadedEpisodes = allEpisodes.filter((episode) => episode.isDownloaded);
      warmLibraryImages(podcasts, episodeCache, selectedPodcastId);
      set({
        downloadedEpisodes,
        episodeCache,
        episodesHydrated: true,
        episodes: selectedPodcastId ? (episodeCache.get(selectedPodcastId) ?? []) : [],
        latestEpisodesCache: null,
        latestEpisodesVersion: get().latestEpisodesVersion + 1,
        storageStats: {
          downloadedEpisodes: downloadedEpisodes.length,
          totalSize: downloadedEpisodes.reduce((sum, episode) => sum + (episode.fileSize ?? 0), 0),
        },
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to initialize library.",
        isLoading: false,
      });
    }
  },

  loadEpisodes: async (podcastId) => {
    const cachedEpisodes = get().episodeCache.get(podcastId);
    set({ selectedPodcastId: podcastId });

    if (cachedEpisodes) {
      set({ episodes: cachedEpisodes });
      return;
    }

    try {
      let loadPromise = episodeLoadPromises.get(podcastId);

      if (!loadPromise) {
        loadPromise = desktopApi.episodes
          .listByPodcast(podcastId)
          .then((items) => items.map(toEpisode))
          .finally(() => {
            episodeLoadPromises.delete(podcastId);
          });
        episodeLoadPromises.set(podcastId, loadPromise);
      }

      const episodes = await loadPromise;
      set((state) => {
        const episodeCache = new Map(state.episodeCache);
        episodeCache.set(podcastId, episodes);
        warmSelectedPodcastImages(state.podcasts, podcastId, episodes);

        return {
          episodeCache,
          episodes: state.selectedPodcastId === podcastId ? episodes : state.episodes,
          latestEpisodesCache: null,
          latestEpisodesVersion: state.latestEpisodesVersion + 1,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load episodes.",
      });
    }
  },

  markEpisodeCompleted: async (episodeId) => {
    const episode = findEpisode(episodeId, get());
    if (!episode) return;
    await get().saveProgress(episodeId, get().playbackState.duration, get().playbackState.duration);
  },

  pausePlayback: () => {
    if (!get().playbackState.isPlaying) return;
    set((state) => ({ playbackState: { ...state.playbackState, isPlaying: false } }));
  },

  playEpisode: (episode) =>
    set((state) => {
      if (state.playbackState.currentEpisode?.id === episode.id) {
        return {
          playbackState: {
            ...state.playbackState,
            isPlaying: true,
          },
        };
      }

      return {
        playbackState: {
          ...state.playbackState,
          currentEpisode: episode,
          currentTime: 0,
          duration: episode.duration ?? 0,
          isLoading: true,
          isPlaying: true,
          showNotes: episode.showNotes || episode.content || episode.description,
        },
        showNotesOpen: state.showNotesOpen,
      };
    }),

  refreshAllPodcasts: async () => {
    set({ isRefreshing: true });
    try {
      for (const podcast of get().podcasts) {
        await desktopApi.library.refresh(podcast.id);
      }
      await get().initializeStore();
      get().clearLatestEpisodesCache();
    } finally {
      set({ isRefreshing: false });
    }
  },

  refreshPodcast: async (podcastId) => {
    set({ isRefreshing: true });
    try {
      await desktopApi.library.refresh(podcastId);
      set((state) => {
        const episodeCache = new Map(state.episodeCache);
        episodeCache.delete(podcastId);
        return { episodeCache };
      });
      await get().initializeStore();
      await get().loadEpisodes(podcastId);
      get().clearLatestEpisodesCache();
    } finally {
      set({ isRefreshing: false });
    }
  },

  refreshStorageStats: async () => {
    const downloadedEpisodes = await get().getDownloadedEpisodes();
    set({
      storageStats: {
        downloadedEpisodes: downloadedEpisodes.length,
        totalSize: downloadedEpisodes.reduce((sum, episode) => sum + (episode.fileSize ?? 0), 0),
      },
    });
  },

  resumePlayback: () => {
    const { playbackState } = get();
    if (!playbackState.currentEpisode || playbackState.isPlaying) return;
    set((state) => ({ playbackState: { ...state.playbackState, isPlaying: true } }));
  },

  retryDownload: async (episode) => get().downloadEpisode(episode),

  saveProgress: async (episodeId, currentTime, duration) => {
    const episode = findEpisode(episodeId, get());
    if (!episode) return;
    const progress: PlaybackProgress = {
      currentTime,
      duration,
      episodeId,
      id: episodeId,
      isCompleted: duration > 0 && currentTime >= duration * 0.95,
      lastPlayedAt: new Date(),
      podcastId: episode.podcastId,
    };
    await desktopApi.playback.saveProgress(progress);
    set((state) => {
      const playbackProgress = new Map(state.playbackProgress);
      playbackProgress.set(episodeId, progress);
      return { playbackProgress };
    });
  },

  seekToTime: (time) =>
    set((state) => ({
      playbackState: { ...state.playbackState, currentTime: time, seekRequested: true },
    })),

  setAutoPlay: (autoPlay) =>
    set((state) => ({ preferences: { ...state.preferences, autoPlay } })),

  setCurrentPage: (currentPage) => set({ currentPage }),

  setCurrentTime: (currentTime) =>
    set((state) => ({ playbackState: { ...state.playbackState, currentTime } })),

  setDuration: (duration) =>
    set((state) => ({ playbackState: { ...state.playbackState, duration } })),

  setError: (error) => set({ error }),

  setItunesSearchEnabled: (itunesSearchEnabled) =>
    set((state) => ({ preferences: { ...state.preferences, itunesSearchEnabled } })),

  setLoading: (isLoading) => {
    if (get().playbackState.isLoading === isLoading) return;
    set((state) => ({ playbackState: { ...state.playbackState, isLoading } }));
  },

  setProgressDialog: (data) =>
    set((state) => ({ progressDialog: { ...state.progressDialog, ...data } })),

  setSelectedPodcast: (selectedPodcastId) => {
    if (get().selectedPodcastId === selectedPodcastId) return;
    const cachedEpisodes = selectedPodcastId ? get().episodeCache.get(selectedPodcastId) : undefined;
    if (selectedPodcastId) {
      warmSelectedPodcastImages(get().podcasts, selectedPodcastId, cachedEpisodes ?? []);
    }
    set((state) => ({
      episodes: cachedEpisodes ?? state.episodes,
      selectedPodcastId,
    }));
  },

  setShowAddPodcastDialog: (showAddPodcastDialog) => set({ showAddPodcastDialog }),

  setSkipInterval: (skipInterval) =>
    set((state) => ({ preferences: { ...state.preferences, skipInterval } })),

  setTheme: (theme) => set((state) => ({ preferences: { ...state.preferences, theme } })),

  setVolume: (volume) =>
    set((state) => ({ playbackState: { ...state.playbackState, volume } })),

  setWhatsNewCount: (whatsNewCount) =>
    set((state) => ({ preferences: { ...state.preferences, whatsNewCount } })),

  subscribeToPodcast: async (feedUrl) => {
    set({
      progressDialog: {
        currentItem: "Getting podcast information...",
        isOpen: true,
        progress: 1,
        title: "Adding Podcast",
        total: 3,
      },
    });
    try {
      const podcast = toPodcast(await desktopApi.library.subscribe(feedUrl));
      set((state) => ({
        podcasts: [podcast, ...state.podcasts.filter((entry) => entry.id !== podcast.id)],
        progressDialog: { ...state.progressDialog, isOpen: false },
        selectedPodcastId: podcast.id,
        showAddPodcastDialog: false,
      }));
      await get().loadEpisodes(podcast.id);
      warmSelectedPodcastImages(get().podcasts, podcast.id, get().episodeCache.get(podcast.id) ?? []);
      get().clearLatestEpisodesCache();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add podcast.";
      set((state) => ({
        error: message,
        progressDialog: { ...state.progressDialog, isOpen: false },
      }));
      throw new Error(message);
    }
  },

  toggleShowNotes: () => set((state) => ({ showNotesOpen: !state.showNotesOpen })),

  unsubscribeFromPodcast: async (podcastId) => {
    await desktopApi.library.unsubscribe(podcastId);
    set((state) => {
      const podcasts = state.podcasts.filter((podcast) => podcast.id !== podcastId);
      const episodeCache = new Map(state.episodeCache);
      episodeCache.delete(podcastId);
      return {
        episodeCache,
        episodes: state.selectedPodcastId === podcastId ? [] : state.episodes,
        podcasts,
        selectedPodcastId:
          state.selectedPodcastId === podcastId
            ? (podcasts[0]?.id ?? null)
            : state.selectedPodcastId,
      };
    });
    get().clearLatestEpisodesCache();
  },

  updateDownloadProgress: (episodeId, progress) =>
    set((state) => {
      const downloadProgress = new Map(state.downloadProgress);
      downloadProgress.set(episodeId, progress);
      return { downloadProgress };
    }),

  updateProgress: (progress, currentItem) =>
    set((state) => ({
      progressDialog: {
        ...state.progressDialog,
        currentItem: currentItem ?? state.progressDialog.currentItem,
        progress,
      },
    })),
}));

async function reloadSelectedEpisodes(
  set: (partial: Partial<PodcastStore>) => void,
  get: () => PodcastStore,
) {
  const selectedPodcastId = get().selectedPodcastId;
  if (selectedPodcastId) {
    const episodes = (await desktopApi.episodes.listByPodcast(selectedPodcastId)).map(toEpisode);
    const episodeCache = new Map(get().episodeCache);
    episodeCache.set(selectedPodcastId, episodes);
    set({
      episodeCache,
      episodes,
      latestEpisodesCache: null,
      latestEpisodesVersion: get().latestEpisodesVersion + 1,
    });
  }
}

async function loadEpisodesFromLibrary(
  set: (partial: Partial<PodcastStore>) => void,
  get: () => PodcastStore,
) {
  if (get().episodesHydrated) {
    const episodes = cachedEpisodes(get());
    if (episodes.length > 0 || get().podcasts.length === 0) {
      return episodes;
    }
  }

  const episodes = await listLibraryEpisodes(get().podcasts);
  const episodeCache = groupEpisodesByPodcast(episodes, get().podcasts);
  warmLibraryImages(get().podcasts, episodeCache, get().selectedPodcastId);
  set({
    episodeCache,
    episodesHydrated: true,
    latestEpisodesCache: null,
    latestEpisodesVersion: get().latestEpisodesVersion + 1,
  });
  return episodes;
}

function cachedEpisodes(state: PodcastStore) {
  return [...state.episodeCache.values()].flat();
}

async function listLibraryEpisodes(podcasts: Podcast[]) {
  const listAll = desktopApi.episodes.listAll as (() => Promise<EpisodeSummary[]>) | undefined;

  if (listAll) {
    const episodes = (await listAll()).map(toEpisode);
    if (episodes.length > 0 || podcasts.length === 0) {
      return episodes;
    }
  }

  const episodeGroups = await Promise.all(
    podcasts.map((podcast) => desktopApi.episodes.listByPodcast(podcast.id)),
  );
  return episodeGroups.flat().map(toEpisode);
}

function groupEpisodesByPodcast(episodes: Episode[], podcasts: Podcast[] = []) {
  const episodeCache = new Map<string, Episode[]>();
  for (const podcast of podcasts) {
    episodeCache.set(podcast.id, []);
  }

  for (const episode of episodes) {
    const current = episodeCache.get(episode.podcastId);
    if (current) {
      current.push(episode);
    } else {
      episodeCache.set(episode.podcastId, [episode]);
    }
  }

  return episodeCache;
}

function selectPodcastId(currentPodcastId: string | null, podcasts: Podcast[]) {
  if (currentPodcastId && podcasts.some((podcast) => podcast.id === currentPodcastId)) {
    return currentPodcastId;
  }

  return podcasts[0]?.id ?? null;
}

function warmPodcastCoverImages(podcasts: Podcast[]) {
  preloadImageUrls(
    podcasts.map((podcast) => podcast.imageUrl),
    { limit: 120 },
  );
}

function warmLibraryImages(
  podcasts: Podcast[],
  episodeCache: Map<string, Episode[]>,
  selectedPodcastId: string | null,
) {
  const urls = podcasts.flatMap((podcast) => [
    podcast.imageUrl,
    ...(episodeCache.get(podcast.id) ?? []).slice(0, 8).map((episode) => episode.imageUrl),
  ]);

  preloadImageUrls(urls, { limit: 500 });

  if (selectedPodcastId) {
    warmSelectedPodcastImages(podcasts, selectedPodcastId, episodeCache.get(selectedPodcastId) ?? []);
  }
}

function warmSelectedPodcastImages(podcasts: Podcast[], podcastId: string, episodes: Episode[]) {
  const podcast = podcasts.find((entry) => entry.id === podcastId);
  preloadImageUrls([podcast?.imageUrl, ...episodes.slice(0, 24).map((episode) => episode.imageUrl)], {
    immediate: true,
    limit: 32,
  });
}

function findEpisode(episodeId: string, state: PodcastStore) {
  return (
    state.episodes.find((episode) => episode.id === episodeId) ??
    state.downloadedEpisodes.find((episode) => episode.id === episodeId) ??
    state.playbackState.currentEpisode
  );
}

function toPodcast(podcast: PodcastSummary): Podcast {
  return {
    author: podcast.author,
    categories: [],
    description: podcast.description ?? "",
    feedUrl: podcast.feedUrl,
    id: podcast.id,
    imageUrl: podcast.imageUrl,
    language: podcast.language,
    lastUpdated: toDate(podcast.lastUpdated),
    subscriptionDate: toDate(podcast.subscriptionDate),
    title: podcast.title,
  };
}

function toEpisode(episode: EpisodeSummary): Episode {
  return {
    audioUrl: episode.audioUrl,
    content: episode.content,
    description: episode.description ?? "",
    downloadedAt: episode.downloadedAt ? toDate(episode.downloadedAt) : undefined,
    downloadedPath: episode.downloadedPath,
    duration: episode.duration,
    fileSize: episode.fileSize,
    guid: episode.guid,
    id: episode.id,
    imageUrl: episode.imageUrl,
    isDownloaded: Boolean(episode.downloadedPath),
    podcastId: episode.podcastId,
    publishedAt: toDate(episode.publishedAt),
    showNotes: episode.content,
    title: episode.title,
  };
}

function toDate(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function extractOpmlFeeds(opmlContent: string) {
  const document = new DOMParser().parseFromString(opmlContent, "text/xml");
  return Array.from(document.querySelectorAll("outline[xmlUrl]"))
    .map((node) => {
      const feedUrl = node.getAttribute("xmlUrl")?.trim();
      if (!feedUrl) {
        return null;
      }

      return {
        feedUrl,
        title: node.getAttribute("title") ?? node.getAttribute("text") ?? feedUrl,
      };
    })
    .filter((value): value is { feedUrl: string; title: string } => Boolean(value));
}
