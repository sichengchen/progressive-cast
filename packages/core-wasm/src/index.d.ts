export interface ParseFeedRequest {
  feedUrl: string;
  xml: string;
  fetchedAt: string;
}

export interface Podcast {
  id: string;
  feedUrl: string;
  title: string;
  author?: string;
  description: string;
  imageUrl?: string;
  language?: string;
  subscriptionDate: string;
  lastUpdated: string;
}

export interface Episode {
  id: string;
  podcastId: string;
  guid?: string;
  title: string;
  description: string;
  content?: string;
  audioUrl: string;
  imageUrl?: string;
  publishedAt?: string;
  duration?: number;
}

export interface ParsedFeed {
  podcast: Podcast;
  episodes: Episode[];
}

export function initializeCore(module: BufferSource | WebAssembly.Module): void;
export function parseFeed(request: ParseFeedRequest): ParsedFeed;
