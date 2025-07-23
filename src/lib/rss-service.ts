import Parser from 'rss-parser';
import type { RSSFeed, RSSEpisode, Podcast, Episode } from './types';

const parser = new Parser();

export class RSSService {
  static async parseFeed(feedUrl: string): Promise<RSSFeed> {
    try {
      console.log('Parsing feed via local API:', feedUrl);
      
      const apiUrl = `/api/rss?url=${encodeURIComponent(feedUrl)}`;
      console.log('Making request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON, try to get text content
          const textContent = await response.text();
          console.error('Non-JSON API response:', textContent);
          errorData = { error: textContent || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          feedUrl
        });
        throw new Error(errorMessage);
      }

      // Parse the returned XML content directly
      const xmlContent = await response.text();
      console.log('Received XML content length:', xmlContent.length);
      console.log('XML content starts with:', xmlContent.substring(0, 200));
      
      if (!xmlContent || xmlContent.trim().length === 0) {
        throw new Error('Empty response from RSS feed');
      }
      
      // Additional validation for XML content
      const trimmedContent = xmlContent.trim();
      if (!trimmedContent.startsWith('<?xml') && !trimmedContent.startsWith('<rss') && !trimmedContent.startsWith('<feed')) {
        console.error('Invalid XML format. Content preview:', trimmedContent.substring(0, 500));
        throw new Error('Invalid XML format in RSS response');
      }
      
      const feed = await parser.parseString(xmlContent);
      console.log('Parsed feed:', feed.title, 'with', feed.items?.length || 0, 'episodes');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const episodes: RSSEpisode[] = feed.items?.map((item: any) => ({
        title: item.title || 'Untitled Episode',
        description: item.description || item.contentSnippet || '',
        content: item.content || item['content:encoded'] || item.description || '',
        audioUrl: this.extractAudioUrl(item),
        duration: this.parseDuration(item['itunes:duration']),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        imageUrl: this.extractImageUrl(item) || this.extractImageUrl(feed),
        episodeNumber: item['itunes:episode'] ? parseInt(item['itunes:episode'], 10) : undefined,
        seasonNumber: item['itunes:season'] ? parseInt(item['itunes:season'], 10) : undefined,
      })) || [];

      return {
        title: feed.title || 'Unknown Podcast',
        description: feed.description || '',
        feedUrl,
        imageUrl: this.extractImageUrl(feed),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        author: (feed as any)['itunes:author'] || (feed as any).author || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        language: (feed as any).language || undefined,
        categories: this.extractCategories(feed),
        episodes,
      };
    } catch (error) {
      console.error('Error parsing RSS feed:', {
        feedUrl,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the RSS feed. Please check your internet connection and ensure the development server is running.');
      }
      
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('RSS feed request timed out. The feed may be temporarily unavailable or slow to respond.');
      }
      
      if (error instanceof Error && error.message.includes('Invalid XML')) {
        throw new Error('The RSS feed returned invalid XML content. This may be a temporary issue with the feed.');
      }
      
      if (error instanceof Error) {
        throw new Error(`Failed to parse RSS feed: ${error.message}`);
      }
      
      throw new Error('Failed to parse RSS feed: Unknown error');
    }
  }

  static async validateFeedUrl(feedUrl: string): Promise<boolean> {
    try {
      await this.parseFeed(feedUrl);
      return true;
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractAudioUrl(item: any): string {
    // Try to find audio URL from enclosure
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }

    // Try to find audio URL from content
    if (item.content) {
      const audioMatch = item.content.match(/src="([^"]*\.(mp3|m4a|ogg|wav))"/i);
      if (audioMatch) {
        return audioMatch[1];
      }
    }

    // Fallback to link if no audio URL found
    return item.link || '';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractImageUrl(item: any): string | undefined {
    if (item.itunes?.image) return item.itunes.image;
    if (item.image) return item.image;
    
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractCategories(feed: any): string[] {
    const categories: string[] = [];
    
    if (feed.categories) {
      if (Array.isArray(feed.categories)) {
        categories.push(...feed.categories);
      } else {
        categories.push(feed.categories);
      }
    }

    if (feed['itunes:category']) {
      if (Array.isArray(feed['itunes:category'])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categories.push(...feed['itunes:category'].map((cat: any) => cat.text || cat));
      } else {
        categories.push(feed['itunes:category'].text || feed['itunes:category']);
      }
    }

    return categories.filter(Boolean);
  }

  private static parseDuration(duration?: string): number | undefined {
    if (!duration) return undefined;

    // Handle different duration formats
    if (duration.includes(':')) {
      const parts = duration.split(':').map(Number);
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      }
    }

    // Try to parse as seconds
    const seconds = parseInt(duration, 10);
    return isNaN(seconds) ? undefined : seconds;
  }

  // Convert RSS feed to Podcast entity
  static rssFeedToPodcast(feed: RSSFeed): Podcast {
    return {
      id: this.generatePodcastId(feed.feedUrl),
      title: feed.title,
      description: feed.description,
      imageUrl: feed.imageUrl,
      feedUrl: feed.feedUrl,
      author: feed.author,
      language: feed.language,
      categories: feed.categories,
      lastUpdated: new Date(),
      subscriptionDate: new Date(),
    };
  }

  // Convert RSS episodes to Episode entities
  static rssEpisodesToEpisodes(episodes: RSSEpisode[], podcastId: string): Episode[] {
    return episodes.map((episode) => ({
      id: this.generateEpisodeId(podcastId, episode.title, episode.publishedAt),
      podcastId,
      title: episode.title,
      description: episode.description,
      content: episode.content,
      audioUrl: episode.audioUrl,
      duration: episode.duration,
      publishedAt: episode.publishedAt,
      imageUrl: episode.imageUrl,
      episodeNumber: episode.episodeNumber,
      seasonNumber: episode.seasonNumber,
    }));
  }

  private static generatePodcastId(feedUrl: string): string {
    return `podcast_${btoa(feedUrl).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private static generateEpisodeId(podcastId: string, title: string, publishedAt: Date): string {
    const titleSlug = title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const timestamp = publishedAt.getTime();
    return `${podcastId}_${titleSlug}_${timestamp}`;
  }
} 