import type { Episode, Podcast, RSSFeed, RSSEpisode } from "./types";

export class RSSService {
  static async parseFeed(feedUrl: string): Promise<RSSFeed> {
    try {
      const apiUrl = `/api/rss?url=${encodeURIComponent(feedUrl)}`;

      const response = await fetch(apiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
        method: "GET",
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const textContent = await response.text();
          errorData = {
            error: textContent || `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const xmlContent = await response.text();
      if (!xmlContent.trim()) {
        throw new Error("Empty response from RSS feed");
      }

      const xml = new DOMParser().parseFromString(xmlContent, "text/xml");
      if (xml.querySelector("parsererror")) {
        throw new Error("Invalid XML format in RSS response");
      }

      const channel = xml.querySelector("channel");
      const feed = xml.querySelector("feed");
      const root = channel ?? feed ?? xml.documentElement;
      const feedImage = this.extractFeedImage(root);

      const episodes = Array.from(xml.querySelectorAll("item, entry")).map((item) =>
        this.parseEpisode(item, feedImage),
      );

      return {
        author: this.getTextContent(root, [
          "itunes\\:author",
          "author > name",
          "author",
          "managingEditor",
        ]),
        categories: this.extractCategories(root),
        description:
          this.getTextContent(root, ["description", "subtitle", "itunes\\:summary", "summary"]) ||
          "",
        episodes,
        feedUrl,
        imageUrl: feedImage,
        language: this.getTextContent(root, ["language"]),
        title: this.getTextContent(root, ["title", "itunes\\:title"]) || "Unknown Podcast",
      };
    } catch (error) {
      console.error("Error parsing RSS feed:", {
        error: error instanceof Error ? error.message : error,
        feedUrl,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        throw new Error(
          "Unable to connect to the RSS feed. Please check your internet connection and ensure the development server is running.",
        );
      }

      if (error instanceof Error && error.message.includes("timeout")) {
        throw new Error(
          "RSS feed request timed out. The feed may be temporarily unavailable or slow to respond.",
        );
      }

      if (error instanceof Error && error.message.includes("Invalid XML")) {
        throw new Error(
          "The RSS feed returned invalid XML content. This may be a temporary issue with the feed.",
        );
      }

      if (error instanceof Error) {
        throw new Error(`Failed to parse RSS feed: ${error.message}`);
      }

      throw new Error("Failed to parse RSS feed: Unknown error");
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

  private static extractAudioUrl(item: Element): string {
    const enclosureUrl = item.querySelector("enclosure")?.getAttribute("url");
    if (enclosureUrl) {
      return enclosureUrl;
    }

    const enclosureLink = item.querySelector('link[rel="enclosure"]')?.getAttribute("href");
    if (enclosureLink) {
      return enclosureLink;
    }

    const mediaContent = item.querySelector("media\\:content, content")?.getAttribute("url");
    if (mediaContent) {
      return mediaContent;
    }

    return (
      this.getTextContent(item, ["link"]) || item.querySelector("link")?.getAttribute("href") || ""
    );
  }

  private static extractCategories(root: Element): string[] {
    const categoryNodes = Array.from(root.querySelectorAll("category, itunes\\:category"));

    return [
      ...new Set(
        categoryNodes
          .map((node) => node.getAttribute("text") || node.textContent?.trim() || "")
          .filter(Boolean),
      ),
    ];
  }

  private static extractFeedImage(root: Element): string | undefined {
    return (
      root.querySelector("itunes\\:image")?.getAttribute("href") ||
      this.getTextContent(root, ["image > url"]) ||
      root.querySelector("media\\:thumbnail")?.getAttribute("url") ||
      undefined
    );
  }

  private static extractItemImage(item: Element, fallbackImage?: string): string | undefined {
    return (
      item.querySelector("itunes\\:image")?.getAttribute("href") ||
      item.querySelector("media\\:thumbnail")?.getAttribute("url") ||
      this.getTextContent(item, ["image > url"]) ||
      fallbackImage
    );
  }

  private static getTextContent(root: ParentNode, selectors: string[]): string | undefined {
    for (const selector of selectors) {
      const content = root.querySelector(selector)?.textContent?.trim();
      if (content) {
        return content;
      }
    }

    return undefined;
  }

  private static parseDuration(value?: string): number | undefined {
    if (!value) return undefined;

    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    const segments = value.split(":").map((segment) => parseInt(segment, 10));
    if (segments.some(Number.isNaN)) {
      return undefined;
    }

    if (segments.length === 3) {
      return segments[0] * 3600 + segments[1] * 60 + segments[2];
    }

    if (segments.length === 2) {
      return segments[0] * 60 + segments[1];
    }

    return undefined;
  }

  private static parseEpisode(item: Element, fallbackImage?: string): RSSEpisode {
    const description = this.getTextContent(item, ["description", "summary", "content"]) || "";
    const showNotes =
      this.getTextContent(item, [
        "content\\:encoded",
        "itunes\\:summary",
        "summary",
        "description",
        "content",
      ]) || "";
    const publishedAt = this.getTextContent(item, ["pubDate", "published", "updated"]) || "";
    const episodeNumber = this.getTextContent(item, ["itunes\\:episode"]);
    const seasonNumber = this.getTextContent(item, ["itunes\\:season"]);

    return {
      audioUrl: this.extractAudioUrl(item),
      content:
        this.getTextContent(item, ["content\\:encoded", "content", "summary", "description"]) || "",
      description,
      duration: this.parseDuration(this.getTextContent(item, ["itunes\\:duration"])),
      episodeNumber: episodeNumber ? parseInt(episodeNumber, 10) : undefined,
      imageUrl: this.extractItemImage(item, fallbackImage),
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      seasonNumber: seasonNumber ? parseInt(seasonNumber, 10) : undefined,
      showNotes,
      title: this.getTextContent(item, ["title"]) || "Untitled Episode",
    };
  }

  static mapFeedToPodcast(feed: RSSFeed): { podcast: Podcast; episodes: Episode[] } {
    const podcastId = this.generatePodcastId(feed.feedUrl);
    const now = new Date();

    const podcast: Podcast = {
      author: feed.author,
      categories: feed.categories,
      description: feed.description,
      feedUrl: feed.feedUrl,
      id: podcastId,
      imageUrl: feed.imageUrl,
      language: feed.language,
      lastUpdated: now,
      subscriptionDate: now,
      title: feed.title,
    };

    const episodes: Episode[] = feed.episodes.map((episode, index) => ({
      audioUrl: episode.audioUrl,
      content: episode.content,
      description: episode.description,
      duration: episode.duration,
      episodeNumber: episode.episodeNumber,
      id: this.generateEpisodeId(podcastId, episode.audioUrl, index),
      imageUrl: episode.imageUrl,
      podcastId,
      publishedAt: episode.publishedAt,
      seasonNumber: episode.seasonNumber,
      showNotes: episode.showNotes,
      title: episode.title,
    }));

    return { podcast, episodes };
  }

  static rssEpisodesToEpisodes(episodes: RSSEpisode[], podcastId: string): Episode[] {
    return episodes.map((episode, index) => ({
      audioUrl: episode.audioUrl,
      content: episode.content,
      description: episode.description,
      duration: episode.duration,
      episodeNumber: episode.episodeNumber,
      id: this.generateEpisodeId(podcastId, episode.audioUrl, index),
      imageUrl: episode.imageUrl,
      podcastId,
      publishedAt: episode.publishedAt,
      seasonNumber: episode.seasonNumber,
      showNotes: episode.showNotes,
      title: episode.title,
    }));
  }

  static rssFeedToPodcast(feed: RSSFeed): Podcast {
    return this.mapFeedToPodcast(feed).podcast;
  }

  private static generatePodcastId(feedUrl: string): string {
    let hash = 0;
    for (let i = 0; i < feedUrl.length; i++) {
      const char = feedUrl.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `podcast_${Math.abs(hash)}`;
  }

  private static generateEpisodeId(podcastId: string, audioUrl: string, index: number): string {
    const baseString = `${podcastId}_${audioUrl}_${index}`;
    let hash = 0;
    for (let i = 0; i < baseString.length; i++) {
      const char = baseString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `episode_${Math.abs(hash)}`;
  }
}
