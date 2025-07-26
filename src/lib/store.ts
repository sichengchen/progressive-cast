import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Podcast, Episode, PlaybackProgress, PlaybackState, UserPreferences, DownloadProgress, StorageStats } from './types';
import { DatabaseService } from './database';
import { RSSService } from './rss-service';
import { DownloadService } from './download-service';

const defaultPreferences: UserPreferences = {
  theme: 'system',
  skipInterval: 30,
  autoPlay: false,
  whatsNewCount: 10,
  itunesSearchEnabled: true,
};

const ensureCompletePreferences = (preferences: Partial<UserPreferences> = {}): UserPreferences => {
  return { ...defaultPreferences, ...preferences };
};

interface PodcastStore {
  // State
  podcasts: Podcast[];
  episodes: Episode[];
  playbackProgress: Map<string, PlaybackProgress>;
  playbackState: PlaybackState;
  preferences: UserPreferences;
  selectedPodcastId: string | null;
  showNotesOpen: boolean;
  currentPage: 'podcasts' | 'whats-new' | 'resume-playing' | 'settings' | 'downloaded';
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Download state
  downloadProgress: Map<string, DownloadProgress>;
  downloadedEpisodes: Episode[];
  storageStats: StorageStats | null;

  // Cache for latest episodes to improve performance
  latestEpisodesCache: {
    episodes: Episode[];
    timestamp: number;
    count: number;
  } | null;

  // Progress state
  progressDialog: {
    isOpen: boolean;
    title: string;
    currentItem: string;
    progress: number;
    total: number;
  };

  // Actions
  initializeStore: () => Promise<void>;

  // Podcast actions
  subscribeToPodcast: (feedUrl: string) => Promise<void>;
  unsubscribeFromPodcast: (podcastId: string) => Promise<void>;
  refreshPodcast: (podcastId: string) => Promise<void>;
  refreshAllPodcasts: () => Promise<void>;
  setSelectedPodcast: (podcastId: string | null) => void;

  // Episode actions
  loadEpisodes: (podcastId: string) => Promise<void>;
  getLatestEpisodes: () => Promise<Episode[]>;
  getUnfinishedEpisodes: () => Promise<Episode[]>;
  clearLatestEpisodesCache: () => void;
  toggleShowNotes: () => void;

  // Page navigation
  setCurrentPage: (page: 'podcasts' | 'whats-new' | 'resume-playing' | 'settings' | 'downloaded') => void;

  // Playback actions
  playEpisode: (episode: Episode) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  setCurrentTime: (time: number) => void;
  seekToTime: (time: number) => void;
  clearSeekRequest: () => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  setLoading: (isLoading: boolean) => void;
  saveProgress: (episodeId: string, currentTime: number, duration: number) => Promise<void>;
  markEpisodeCompleted: (episodeId: string) => Promise<void>;

  // Preference actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSkipInterval: (interval: number) => void;
  setWhatsNewCount: (count: number) => void;
  setAutoPlay: (autoPlay: boolean) => void;
  setItunesSearchEnabled: (enabled: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Progress dialog actions
  setProgressDialog: (data: { isOpen: boolean; title?: string; currentItem?: string; progress?: number; total?: number }) => void;
  updateProgress: (progress: number, currentItem?: string) => void;
  closeProgressDialog: () => void;

  // OPML import
  importFromOPML: (opmlContent: string) => Promise<{ imported: number; errors: number }>;

  // Data management
  clearAllData: () => Promise<void>;

  // Download actions
  downloadEpisode: (episode: Episode) => Promise<void>;
  cancelDownload: (episodeId: string) => Promise<void>;
  deleteDownload: (episodeId: string) => Promise<void>;
  getDownloadedEpisodes: () => Promise<Episode[]>;
  retryDownload: (episode: Episode) => Promise<void>;
  refreshStorageStats: () => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  updateDownloadProgress: (episodeId: string, progress: DownloadProgress) => void;
}

export const usePodcastStore = create<PodcastStore>()(
  persist(
    (set, get) => ({
      // Initial state
      podcasts: [],
      episodes: [],
      playbackProgress: new Map(),
      playbackState: {
        currentEpisode: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isLoading: false,
        showNotes: '',
        seekRequested: false,
      },
      preferences: defaultPreferences,
      selectedPodcastId: null,
      showNotesOpen: false,
      currentPage: 'whats-new' as const,
      isLoading: false,
      isRefreshing: false,
      error: null,
      latestEpisodesCache: null,

      // Download state
      downloadProgress: new Map(),
      downloadedEpisodes: [],
      storageStats: null,

      // Progress dialog initial state
      progressDialog: {
        isOpen: false,
        title: '',
        currentItem: '',
        progress: 0,
        total: 0,
      },

      // Initialize store with data from IndexedDB
      initializeStore: async () => {
        try {
          set({ isLoading: true });

          const [podcasts, allProgress, downloadProgress, downloadedEpisodes, storageStats] = await Promise.all([
            DatabaseService.getPodcasts(),
            DatabaseService.exportData().then(data => data.playbackProgress),
            DatabaseService.getAllDownloadProgress(),
            DatabaseService.getDownloadedEpisodes(),
            DownloadService.getStorageStats()
          ]);

          const progressMap = new Map<string, PlaybackProgress>();
          allProgress.forEach(progress => {
            progressMap.set(progress.episodeId, progress);
          });

          const downloadProgressMap = new Map<string, DownloadProgress>();
          downloadProgress.forEach(progress => {
            downloadProgressMap.set(progress.episodeId, progress);
          });

          set({
            podcasts,
            playbackProgress: progressMap,
            downloadProgress: downloadProgressMap,
            downloadedEpisodes,
            storageStats,
            isLoading: false
          });
        } catch (error) {
          set({
            error: `Failed to initialize store: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isLoading: false
          });
        }
      },

      // Subscribe to a new podcast
      subscribeToPodcast: async (feedUrl: string) => {
        try {
          set({ error: null });

          // Start progress dialog
          const { setProgressDialog, updateProgress, closeProgressDialog } = get();
          setProgressDialog({
            isOpen: true,
            title: 'Adding Podcast',
            currentItem: 'Getting podcast information...',
            progress: 0,
            total: 3
          });

          // Step 1: Parse feed
          updateProgress(1, 'Parsing RSS feed...');
          const feed = await RSSService.parseFeed(feedUrl);

          // Check if already subscribed
          const existing = get().podcasts.find(p => p.feedUrl === feedUrl);
          if (existing) {
            closeProgressDialog();
            throw new Error('Already subscribed to this podcast');
          }

          // Step 2: Convert to internal format
          updateProgress(2, `Processing podcast: ${feed.title}`);
          const podcast = RSSService.rssFeedToPodcast(feed);
          const episodes = RSSService.rssEpisodesToEpisodes(feed.episodes, podcast.id);

          // Step 3: Save to database
          updateProgress(3, 'Saving to local database...');
          await DatabaseService.addPodcast(podcast);
          await DatabaseService.addEpisodes(episodes);

          // Update state and close dialog
          set(state => ({
            podcasts: [podcast, ...state.podcasts],
          }));

          // Clear cache since we have new episodes
          get().clearLatestEpisodesCache();

          closeProgressDialog();
        } catch (error) {
          const { closeProgressDialog } = get();
          closeProgressDialog();
          set({
            error: `Failed to subscribe to podcast: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      },

      // Unsubscribe from a podcast
      unsubscribeFromPodcast: async (podcastId: string) => {
        try {
          await DatabaseService.deletePodcast(podcastId);

          set(state => ({
            podcasts: state.podcasts.filter(p => p.id !== podcastId),
            episodes: state.episodes.filter(e => e.podcastId !== podcastId),
            selectedPodcastId: state.selectedPodcastId === podcastId ? null : state.selectedPodcastId
          }));
        } catch (error) {
          set({ error: `Failed to unsubscribe: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      // Refresh a specific podcast
      refreshPodcast: async (podcastId: string) => {
        try {
          const podcast = get().podcasts.find(p => p.id === podcastId);
          if (!podcast) return;

          const feed = await RSSService.parseFeed(podcast.feedUrl);
          const newEpisodes = RSSService.rssEpisodesToEpisodes(feed.episodes, podcast.id);

          // Update podcast metadata
          const updatedPodcast = { ...podcast, lastUpdated: new Date() };
          await DatabaseService.updatePodcast(podcast.id, { lastUpdated: new Date() });

          // Add new episodes (existing ones will be ignored due to unique IDs)
          try {
            await DatabaseService.addEpisodes(newEpisodes);
          } catch {
            // Ignore duplicate errors
          }

          set(state => ({
            podcasts: state.podcasts.map(p => p.id === podcastId ? updatedPodcast : p)
          }));

          // Clear cache since episodes may have been updated
          get().clearLatestEpisodesCache();
        } catch (error) {
          set({ error: `Failed to refresh podcast: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      // Refresh all podcasts
      refreshAllPodcasts: async () => {
        try {
          set({ isRefreshing: true, error: null });
          const { podcasts } = get();
          await Promise.all(podcasts.map(podcast => get().refreshPodcast(podcast.id)));
        } catch (error) {
          set({ error: `Failed to refresh podcasts: ${error instanceof Error ? error.message : 'Unknown error'}` });
        } finally {
          set({ isRefreshing: false });
        }
      },

      // Set selected podcast
      setSelectedPodcast: (podcastId: string | null) => {
        set({ selectedPodcastId: podcastId });
        if (podcastId) {
          get().loadEpisodes(podcastId);
        }
      },

      // Load episodes for a podcast
      loadEpisodes: async (podcastId: string) => {
        try {
          const episodes = await DatabaseService.getEpisodesByPodcastId(podcastId);
          set({ episodes });
        } catch (error) {
          set({ error: `Failed to load episodes: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      // Get latest episodes from all podcasts with caching for performance
      getLatestEpisodes: async () => {
        try {
          const { preferences, latestEpisodesCache } = get();
          const limit = preferences.whatsNewCount || 10;
          const cacheValidDuration = 5 * 60 * 1000; // 5 minutes cache

          // Check if we have valid cached data
          if (latestEpisodesCache &&
            latestEpisodesCache.count === limit &&
            Date.now() - latestEpisodesCache.timestamp < cacheValidDuration) {
            return latestEpisodesCache.episodes;
          }

          // Use optimized database query instead of loading all episodes
          const latestEpisodes = await DatabaseService.getLatestEpisodesOptimized(limit);

          // Update cache
          set(() => ({
            latestEpisodesCache: {
              episodes: latestEpisodes,
              timestamp: Date.now(),
              count: limit
            }
          }));

          return latestEpisodes;
        } catch (error) {
          set({ error: `Failed to load latest episodes: ${error instanceof Error ? error.message : 'Unknown error'}` });
          return [];
        }
      },

      // Get unfinished episodes (episodes with progress but not completed)
      getUnfinishedEpisodes: async () => {
        try {
          const { playbackProgress } = get();
          
          // Get all progress records that are not completed and have some progress
          const unfinishedProgressIds: string[] = [];
          playbackProgress.forEach((progress, episodeId) => {
            if (!progress.isCompleted && progress.currentTime > 0) {
              unfinishedProgressIds.push(episodeId);
            }
          });

          if (unfinishedProgressIds.length === 0) {
            return [];
          }

          // Get episodes for the unfinished progress records by fetching each one
          const episodes: Episode[] = [];
          for (const episodeId of unfinishedProgressIds) {
            try {
              const episode = await DatabaseService.getEpisodeById(episodeId);
              if (episode) {
                episodes.push(episode);
              }
            } catch (error) {
              console.warn(`Failed to load episode ${episodeId}:`, error);
            }
          }
          
          // Sort by last played date (most recent first)
          const sortedEpisodes = episodes.sort((a: Episode, b: Episode) => {
            const progressA = playbackProgress.get(a.id);
            const progressB = playbackProgress.get(b.id);
            if (!progressA || !progressB) return 0;
            return new Date(progressB.lastPlayedAt).getTime() - new Date(progressA.lastPlayedAt).getTime();
          });

          return sortedEpisodes;
        } catch (error) {
          set({ error: `Failed to load unfinished episodes: ${error instanceof Error ? error.message : 'Unknown error'}` });
          return [];
        }
      },

      // Clear latest episodes cache when needed
      clearLatestEpisodesCache: () => {
        set({ latestEpisodesCache: null });
      },

      // Toggle show notes
      toggleShowNotes: () => {
        set(state => ({ showNotesOpen: !state.showNotesOpen }));
      },

      // Set current page
      setCurrentPage: (page: 'podcasts' | 'whats-new' | 'resume-playing' | 'settings' | 'downloaded') => {
        set({ currentPage: page });
      },

      // Play an episode
      playEpisode: (episode: Episode) => {
        const { playbackProgress } = get();
        const savedProgress = playbackProgress.get(episode.id);

        set(state => ({
          playbackState: {
            ...state.playbackState,
            currentEpisode: episode,
            isPlaying: true, // Start with true since user clicked play
            currentTime: savedProgress?.currentTime || 0, // Resume from saved position
            duration: savedProgress?.duration || 0, // Use saved duration if available
            isLoading: true, // Show loading state
            showNotes: episode.content || episode.description || '',
          }
        }));
      },

      // Pause playback
      pausePlayback: () => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            isPlaying: false
          }
        }));
      },

      // Resume playback
      resumePlayback: () => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            isPlaying: true
          }
        }));
      },

      // Set current playback time
      setCurrentTime: (time: number) => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            currentTime: time
          }
        }));
      },

      // Seek to a specific time
      seekToTime: (time: number) => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            currentTime: time,
            seekRequested: true
          }
        }));
      },

      // Clear seek request
      clearSeekRequest: () => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            seekRequested: false
          }
        }));
      },

      // Set volume
      setVolume: (volume: number) => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            volume: Math.max(0, Math.min(1, volume))
          }
        }));
      },

      // Set duration
      setDuration: (duration: number) => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            duration
          }
        }));
      },

      // Set loading state
      setLoading: (isLoading: boolean) => {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            isLoading
          }
        }));
      },

      // Save playback progress
      saveProgress: async (episodeId: string, currentTime: number, duration: number) => {
        const { playbackState } = get();
        if (!playbackState.currentEpisode) return;

        const progress: PlaybackProgress = {
          id: `${episodeId}_progress`,
          episodeId,
          podcastId: playbackState.currentEpisode.podcastId,
          currentTime,
          duration,
          lastPlayedAt: new Date(),
          isCompleted: currentTime >= duration * 0.95 // Mark as completed if 95% played
        };

        await DatabaseService.savePlaybackProgress(progress);

        set(state => {
          const newProgressMap = new Map(state.playbackProgress);
          newProgressMap.set(episodeId, progress);
          return { playbackProgress: newProgressMap };
        });
      },

      // Mark episode as completed
      markEpisodeCompleted: async (episodeId: string) => {
        const { playbackState } = get();
        if (!playbackState.currentEpisode) return;

        await DatabaseService.markEpisodeCompleted(episodeId, playbackState.currentEpisode.podcastId);

        const progress: PlaybackProgress = {
          id: `${episodeId}_progress`,
          episodeId,
          podcastId: playbackState.currentEpisode.podcastId,
          currentTime: playbackState.duration,
          duration: playbackState.duration,
          lastPlayedAt: new Date(),
          isCompleted: true
        };

        set(state => {
          const newProgressMap = new Map(state.playbackProgress);
          newProgressMap.set(episodeId, progress);
          return { playbackProgress: newProgressMap };
        });
      },

      // Set theme
      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set(state => ({
          preferences: {
            ...state.preferences,
            theme
          }
        }));
      },

      // Set skip interval
      setSkipInterval: (interval: number) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            skipInterval: interval
          }
        }));
      },

      // Set what's new count
      setWhatsNewCount: (count: number) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            whatsNewCount: count
          }
        }));
      },

      // Set auto play
      setAutoPlay: (autoPlay: boolean) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            autoPlay
          }
        }));
      },

      // Set iTunes search enabled
      setItunesSearchEnabled: (enabled: boolean) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            itunesSearchEnabled: enabled
          }
        }));
      },

      // Set error
      setError: (error: string | null) => {
        set({ error });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Progress dialog actions
      setProgressDialog: (data: { isOpen: boolean; title?: string; currentItem?: string; progress?: number; total?: number }) => {
        set(state => ({
          progressDialog: {
            ...state.progressDialog,
            isOpen: data.isOpen,
            title: data.title || state.progressDialog.title,
            currentItem: data.currentItem || state.progressDialog.currentItem,
            progress: data.progress !== undefined ? data.progress : state.progressDialog.progress,
            total: data.total !== undefined ? data.total : state.progressDialog.total,
          }
        }));
      },

      updateProgress: (progress: number, currentItem?: string) => {
        set(state => ({
          progressDialog: {
            ...state.progressDialog,
            progress,
            currentItem: currentItem || state.progressDialog.currentItem,
          }
        }));
      },

      closeProgressDialog: () => {
        set(state => ({
          progressDialog: {
            ...state.progressDialog,
            isOpen: false,
          }
        }));
      },

      // Import from OPML
      importFromOPML: async (opmlContent: string) => {
        try {
          const { setProgressDialog, updateProgress, closeProgressDialog } = get();

          // Parse OPML
          const parser = new DOMParser();
          const doc = parser.parseFromString(opmlContent, 'application/xml');
          const outlines = doc.querySelectorAll('outline[xmlUrl]');

          const totalFeeds = outlines.length;
          if (totalFeeds === 0) {
            throw new Error('No podcast feeds found in OPML file');
          }

          // Start progress dialog
          setProgressDialog({
            isOpen: true,
            title: 'Importing OPML Subscriptions',
            currentItem: 'Preparing import...',
            progress: 0,
            total: totalFeeds
          });

          let imported = 0;
          let errors = 0;

          for (let i = 0; i < outlines.length; i++) {
            const outline = outlines[i];
            const feedUrl = outline.getAttribute('xmlUrl');
            const title = outline.getAttribute('title') || outline.getAttribute('text') || feedUrl;

            if (feedUrl) {
              try {
                updateProgress(i + 1, `${title}`);

                // Check if already subscribed
                const existing = get().podcasts.find(p => p.feedUrl === feedUrl);
                if (existing) {
                  continue; // Skip already subscribed podcasts
                }

                const feed = await RSSService.parseFeed(feedUrl);
                const podcast = RSSService.rssFeedToPodcast(feed);
                const episodes = RSSService.rssEpisodesToEpisodes(feed.episodes, podcast.id);

                await DatabaseService.addPodcast(podcast);
                await DatabaseService.addEpisodes(episodes);

                set(state => ({
                  podcasts: [podcast, ...state.podcasts],
                }));

                imported++;
              } catch (error) {
                console.error(`Failed to import podcast: ${feedUrl}`, error);
                errors++;
              }
            }
          }

          closeProgressDialog();
          return { imported, errors };
        } catch (error) {
          const { closeProgressDialog } = get();
          closeProgressDialog();
          throw error;
        }
      },

      // Clear all data
      clearAllData: async () => {
        try {
          await DatabaseService.clearAllData();

          // Reset all state to initial values
          set({
            podcasts: [],
            episodes: [],
            playbackProgress: new Map(),
            playbackState: {
              currentEpisode: null,
              isPlaying: false,
              currentTime: 0,
              duration: 0,
              volume: 1,
              isLoading: false,
              showNotes: '',
              seekRequested: false,
            },
            selectedPodcastId: null,
            showNotesOpen: false,
            currentPage: 'whats-new' as const,
            error: null,
            latestEpisodesCache: null,
            downloadProgress: new Map(),
            storageStats: { totalSize: 0, downloadedEpisodes: 0 },
            progressDialog: {
              isOpen: false,
              title: '',
              currentItem: '',
              progress: 0,
              total: 0,
            }
          });
        } catch (error) {
          set({ error: `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      // Download actions
      downloadEpisode: async (episode: Episode) => {
        try {
          // Set up progress callback before queuing download
          DownloadService.setProgressCallback(episode.id, (progress: DownloadProgress) => {
            get().updateDownloadProgress(episode.id, progress);
            
            // If download completed, refresh storage stats and downloaded episodes
            if (progress.status === 'completed') {
              get().refreshStorageStats();
            }
          });
          
          await DownloadService.queueDownload(episode);
        } catch (error) {
          set({ error: `Failed to download episode: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      cancelDownload: async (episodeId: string) => {
        try {
          await DownloadService.cancelDownload(episodeId);
          // Remove progress callback
          DownloadService.removeProgressCallback(episodeId);
          
          set(state => {
            const newDownloadProgress = new Map(state.downloadProgress);
            newDownloadProgress.delete(episodeId);
            return { downloadProgress: newDownloadProgress };
          });
          get().refreshStorageStats();
        } catch (error) {
          set({ error: `Failed to cancel download: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      deleteDownload: async (episodeId: string) => {
        try {
          await DownloadService.deleteDownload(episodeId);
          // Remove progress callback
          DownloadService.removeProgressCallback(episodeId);
          
          // Update episode in local state
          set(state => ({
            episodes: state.episodes.map(ep => 
              ep.id === episodeId 
                ? { ...ep, isDownloaded: false, downloadedPath: undefined, downloadedAt: undefined, fileSize: undefined }
                : ep
            ),
            downloadedEpisodes: state.downloadedEpisodes.filter(ep => ep.id !== episodeId),
            downloadProgress: new Map([...state.downloadProgress].filter(([key]) => key !== episodeId))
          }));
          
          get().refreshStorageStats();
        } catch (error) {
          set({ error: `Failed to delete download: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      retryDownload: async (episode: Episode) => {
        try {
          await DownloadService.retryDownload(episode);
        } catch (error) {
          set({ error: `Failed to retry download: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      getDownloadedEpisodes: async () => {
        try {
          const downloadedEpisodes = await DatabaseService.getDownloadedEpisodes();
          set({ downloadedEpisodes });
          return downloadedEpisodes;
        } catch (error) {
          set({ error: `Failed to get downloaded episodes: ${error instanceof Error ? error.message : 'Unknown error'}` });
          return [];
        }
      },

      refreshStorageStats: async () => {
        try {
          const stats = await DownloadService.getStorageStats();
          set({ storageStats: stats });
        } catch (error) {
          console.error('Failed to refresh storage stats:', error);
        }
      },

      clearAllDownloads: async () => {
        try {
          await DownloadService.clearAllDownloads();
          
          // Clear all progress callbacks (already done in DownloadService.clearAllDownloads)
          // Update local state
          set(state => ({
            episodes: state.episodes.map(ep => ({
              ...ep,
              isDownloaded: false,
              downloadedPath: undefined,
              downloadedAt: undefined,
              fileSize: undefined
            })),
            downloadedEpisodes: [],
            downloadProgress: new Map(),
            storageStats: { totalSize: 0, downloadedEpisodes: 0 }
          }));
        } catch (error) {
          set({ error: `Failed to clear downloads: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      updateDownloadProgress: (episodeId: string, progress: DownloadProgress) => {
        set(state => {
          const newDownloadProgress = new Map(state.downloadProgress);
          newDownloadProgress.set(episodeId, progress);
          
          // If download completed, update episode and downloadedEpisodes
          if (progress.status === 'completed') {
            const updatedEpisodes = state.episodes.map(ep => 
              ep.id === episodeId 
                ? { ...ep, isDownloaded: true }
                : ep
            );
            
            // Add to downloadedEpisodes if not already there
            const completedEpisode = updatedEpisodes.find(ep => ep.id === episodeId);
            const updatedDownloadedEpisodes = completedEpisode && 
              !state.downloadedEpisodes.find(ep => ep.id === episodeId)
              ? [...state.downloadedEpisodes, completedEpisode]
              : state.downloadedEpisodes;
              
            return { 
              downloadProgress: newDownloadProgress,
              episodes: updatedEpisodes,
              downloadedEpisodes: updatedDownloadedEpisodes
            };
          }
          
          return { downloadProgress: newDownloadProgress };
        });
      },
    }),
    {
      name: 'podcast-player-preferences',
      partialize: (state) => ({
        preferences: state.preferences,
        selectedPodcastId: state.selectedPodcastId
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PodcastStore> | undefined;
        return {
          ...currentState,
          ...(persisted || {}),
          preferences: ensureCompletePreferences(persisted?.preferences),
        };
      },
    }
  )
); 