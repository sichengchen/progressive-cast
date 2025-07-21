import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Podcast, Episode, PlaybackProgress, PlaybackState, UserPreferences } from './types';
import { DatabaseService } from './database';
import { RSSService } from './rss-service';

interface PodcastStore {
  // State
  podcasts: Podcast[];
  episodes: Episode[];
  playbackProgress: Map<string, PlaybackProgress>;
  playbackState: PlaybackState;
  preferences: UserPreferences;
  selectedPodcastId: string | null;
  selectedEpisodeId: string | null;
  showNotesOpen: boolean;
  currentPage: 'podcasts' | 'settings';
  isLoading: boolean;
  error: string | null;

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
  setSelectedEpisode: (episodeId: string | null) => void;
  toggleShowNotes: () => void;
  
  // Page navigation
  setCurrentPage: (page: 'podcasts' | 'settings') => void;
  
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
  setAutoPlay: (autoPlay: boolean) => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Data management
  clearAllData: () => Promise<void>;
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
      preferences: {
        theme: 'system',
        skipInterval: 30,
        autoPlay: false,
      },
      selectedPodcastId: null,
      selectedEpisodeId: null,
      showNotesOpen: false,
      currentPage: 'podcasts' as const,
      isLoading: false,
      error: null,

      // Initialize store with data from IndexedDB
      initializeStore: async () => {
        try {
          set({ isLoading: true });
          
          const [podcasts, allProgress] = await Promise.all([
            DatabaseService.getPodcasts(),
            DatabaseService.exportData().then(data => data.playbackProgress)
          ]);

          const progressMap = new Map<string, PlaybackProgress>();
          allProgress.forEach(progress => {
            progressMap.set(progress.episodeId, progress);
          });

          set({ 
            podcasts, 
            playbackProgress: progressMap,
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
          set({ isLoading: true, error: null });

          const feed = await RSSService.parseFeed(feedUrl);
          const podcast = RSSService.rssFeedToPodcast(feed);
          const episodes = RSSService.rssEpisodesToEpisodes(feed.episodes, podcast.id);

          // Check if already subscribed
          const existing = get().podcasts.find(p => p.feedUrl === feedUrl);
          if (existing) {
            throw new Error('Already subscribed to this podcast');
          }

          await DatabaseService.addPodcast(podcast);
          await DatabaseService.addEpisodes(episodes);

          set(state => ({
            podcasts: [podcast, ...state.podcasts],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: `Failed to subscribe to podcast: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isLoading: false 
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
            selectedPodcastId: state.selectedPodcastId === podcastId ? null : state.selectedPodcastId,
            selectedEpisodeId: state.selectedEpisodeId && 
              state.episodes.find(e => e.id === state.selectedEpisodeId)?.podcastId === podcastId 
                ? null : state.selectedEpisodeId
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
        } catch (error) {
          set({ error: `Failed to refresh podcast: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      },

      // Refresh all podcasts
      refreshAllPodcasts: async () => {
        const { podcasts } = get();
        await Promise.all(podcasts.map(podcast => get().refreshPodcast(podcast.id)));
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

      // Set selected episode
      setSelectedEpisode: (episodeId: string | null) => {
        set({ selectedEpisodeId: episodeId });
      },

      // Toggle show notes
      toggleShowNotes: () => {
        set(state => ({ showNotesOpen: !state.showNotesOpen }));
      },

      // Set current page
      setCurrentPage: (page: 'podcasts' | 'settings') => {
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
          },
          selectedEpisodeId: episode.id
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

      // Set auto play
      setAutoPlay: (autoPlay: boolean) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            autoPlay
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
            selectedEpisodeId: null,
            showNotesOpen: false,
            currentPage: 'podcasts' as const,
            error: null
          });
        } catch (error) {
          set({ error: `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      }
    }),
    {
      name: 'podcast-player-preferences',
      partialize: (state) => ({ 
        preferences: state.preferences,
        selectedPodcastId: state.selectedPodcastId 
      }),
    }
  )
); 