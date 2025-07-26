export interface Podcast {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  feedUrl: string;
  author?: string;
  language?: string;
  categories?: string[];
  lastUpdated: Date;
  subscriptionDate: Date;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  content?: string; // Show notes / full content
  audioUrl: string;
  duration?: number; // in seconds
  publishedAt: Date;
  imageUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
}

export interface PlaybackProgress {
  id: string;
  episodeId: string;
  podcastId: string;
  currentTime: number; // in seconds
  duration: number;
  lastPlayedAt: Date;
  isCompleted: boolean;
}

export interface PlaybackState {
  currentEpisode: Episode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  showNotes: string;
  seekRequested: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  skipInterval: number; // in seconds, default 30
  autoPlay: boolean;
  whatsNewCount: number; // number of latest episodes to show in What's New
  itunesSearchEnabled: boolean; // enable iTunes search in search bar, default true
  lastViewedPage?: string;
}

export interface AppState {
  podcasts: Podcast[];
  episodes: Episode[];
  playbackProgress: PlaybackProgress[];
  playbackState: PlaybackState;
  preferences: UserPreferences;
  selectedPodcastId: string | null;
  isLoading: boolean;
  error: string | null;
}

// RSS Feed types
export interface RSSFeed {
  title: string;
  description: string;
  feedUrl: string;
  imageUrl?: string;
  author?: string;
  language?: string;
  categories?: string[];
  episodes: RSSEpisode[];
}

export interface RSSEpisode {
  title: string;
  description: string;
  content?: string;
  audioUrl: string;
  duration?: number;
  publishedAt: Date;
  imageUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
} 