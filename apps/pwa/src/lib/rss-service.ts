import type { Episode, Podcast, RSSFeed, RSSEpisode } from "./types";

type SearchRoot = Document | Element;

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
        let errorData: { error?: string };
        try {
          errorData = (await response.json()) as { error?: string };
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

      const root =
        this.findFirstElement(xml, ["channel"]) ||
        this.findFirstElement(xml, ["feed"]) ||
        xml.documentElement;
      const feedImage = this.extractFeedImage(root);
      const episodes = this.findElements(xml, ["item", "entry"]).map((item) =>
        this.parseEpisode(item, feedImage),
      );

      return {
        author: this.extractAuthor(root) || this.findText(root, ["managingeditor"]) || undefined,
        categories: this.extractCategories(root),
        description:
          this.toPlainText(this.findText(root, ["description", "subtitle", "summary"])) ||
          this.toPlainText(this.findText(root, ["encoded"])) ||
          "",
        episodes,
        feedUrl,
        imageUrl: feedImage || episodes.find((episode) => episode.imageUrl)?.imageUrl,
        language: this.findText(root, ["language"]) || undefined,
        title: this.findText(root, ["title"]) || "Unknown Podcast",
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

      if (error instanceof Error && error.message.includes("exceeds the")) {
        throw new Error(error.message);
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

    const episodes = this.rssEpisodesToEpisodes(feed.episodes, podcastId);

    return { podcast, episodes };
  }

  static rssEpisodesToEpisodes(episodes: RSSEpisode[], podcastId: string): Episode[] {
    return episodes.map((episode, index) => ({
      audioUrl: episode.audioUrl,
      content: episode.content,
      description: episode.description,
      duration: episode.duration,
      episodeNumber: episode.episodeNumber,
      guid: episode.guid,
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

  private static extractAudioUrl(item: Element): string {
    const enclosure = this.findFirstElement(item, ["enclosure"]);
    const enclosureUrl = enclosure?.getAttribute("url");
    if (enclosureUrl) {
      return enclosureUrl;
    }

    const enclosureLink = this.findElements(item, ["link"]).find(
      (element) => element.getAttribute("rel") === "enclosure",
    );
    const enclosureHref = enclosureLink?.getAttribute("href");
    if (enclosureHref) {
      return enclosureHref;
    }

    const mediaContent = this.findFirstElement(item, ["content"]);
    const mediaUrl = mediaContent?.getAttribute("url");
    if (mediaUrl) {
      return mediaUrl;
    }

    return (
      this.findText(item, ["link"]) ||
      this.findFirstElement(item, ["link"])?.getAttribute("href") ||
      ""
    );
  }

  private static extractAuthor(root: SearchRoot): string | undefined {
    const itunesAuthor = this.findText(root, ["author"]);
    if (itunesAuthor) {
      return itunesAuthor;
    }

    const authorElement = this.findFirstElement(root, ["author"]);
    if (!authorElement) {
      return undefined;
    }

    return this.findText(authorElement, ["name"]) || authorElement.textContent?.trim() || undefined;
  }

  private static extractCategories(root: SearchRoot): string[] {
    const categories = this.findElements(root, ["category"])
      .map((element) => element.getAttribute("text") || element.textContent?.trim() || "")
      .filter(Boolean);

    return [...new Set(categories)];
  }

  private static extractFeedImage(root: SearchRoot): string | undefined {
    const itunesImage = this.findFirstElement(root, ["image"])?.getAttribute("href");
    if (itunesImage) {
      return itunesImage;
    }

    const mediaThumbnail = this.findFirstElement(root, ["thumbnail"])?.getAttribute("url");
    if (mediaThumbnail) {
      return mediaThumbnail;
    }

    const imageElement = this.findFirstElement(root, ["image"]);
    const imageUrl =
      imageElement?.getAttribute("href") ||
      this.findText(imageElement || root, ["url"]) ||
      undefined;
    if (imageUrl) {
      return imageUrl;
    }

    const logo = this.findText(root, ["logo", "icon"]);
    if (logo) {
      return logo;
    }

    return this.extractImageFromHtml(this.findText(root, ["description", "summary", "encoded"]));
  }

  private static extractImageFromHtml(html?: string): string | undefined {
    if (!html) return undefined;

    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.querySelector("img")?.getAttribute("src") || undefined;
  }

  private static extractItemImage(item: SearchRoot, fallbackImage?: string): string | undefined {
    const itunesImage = this.findFirstElement(item, ["image"])?.getAttribute("href");
    if (itunesImage) {
      return itunesImage;
    }

    const mediaThumbnail = this.findFirstElement(item, ["thumbnail"])?.getAttribute("url");
    if (mediaThumbnail) {
      return mediaThumbnail;
    }

    const mediaContent = this.findElements(item, ["content"]).find((element) => {
      const medium = element.getAttribute("medium");
      const type = element.getAttribute("type");
      return medium === "image" || type?.startsWith("image/");
    });
    const mediaUrl = mediaContent?.getAttribute("url");
    if (mediaUrl) {
      return mediaUrl;
    }

    const imageUrl = this.extractImageFromHtml(
      this.findText(item, ["encoded", "description", "summary", "content"]),
    );

    return imageUrl || fallbackImage;
  }

  private static extractTextFromHtml(html?: string): string | undefined {
    if (!html) return undefined;

    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent?.trim() || undefined;
  }

  private static toPlainText(value?: string): string | undefined {
    if (!value) return undefined;

    let output = value;
    for (let i = 0; i < 2; i++) {
      output = this.extractTextFromHtml(output) || output;
    }

    const normalized = output.replace(/\s+/g, " ").trim();
    return normalized || undefined;
  }

  private static findElements(root: SearchRoot, names: string[]): Element[] {
    const descendants =
      root instanceof Element
        ? [root, ...Array.from(root.querySelectorAll("*"))]
        : Array.from(root.querySelectorAll("*"));

    return descendants.filter((element) => names.some((name) => this.matchesName(element, name)));
  }

  private static findFirstElement(root: SearchRoot, names: string[]): Element | undefined {
    return this.findElements(root, names)[0];
  }

  private static findText(root: SearchRoot, names: string[]): string | undefined {
    for (const element of this.findElements(root, names)) {
      const text = element.textContent?.trim();
      if (text) {
        return text;
      }
    }

    return undefined;
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

  private static generatePodcastId(feedUrl: string): string {
    let hash = 0;
    for (let i = 0; i < feedUrl.length; i++) {
      const char = feedUrl.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `podcast_${Math.abs(hash)}`;
  }

  private static matchesName(element: Element, name: string): boolean {
    const normalizedName = name.toLowerCase();
    const localName = element.localName?.toLowerCase();
    const nodeName = element.nodeName.toLowerCase();

    return (
      localName === normalizedName ||
      nodeName === normalizedName ||
      nodeName.endsWith(`:${normalizedName}`)
    );
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
    const description =
      this.toPlainText(this.findText(item, ["description", "summary", "content"])) || "";
    const showNotes = this.findText(item, ["encoded", "summary", "description", "content"]) || "";
    const publishedAt = this.findText(item, ["pubdate", "published", "updated"]) || "";
    const episodeNumber = this.findText(item, ["episode"]);
    const seasonNumber = this.findText(item, ["season"]);
    const guid = this.findText(item, ["guid", "id"]) || undefined;

    return {
      audioUrl: this.extractAudioUrl(item),
      content: this.findText(item, ["encoded", "content", "summary", "description"]) || "",
      description,
      duration: this.parseDuration(this.findText(item, ["duration"])),
      episodeNumber: episodeNumber ? parseInt(episodeNumber, 10) : undefined,
      guid,
      imageUrl: this.extractItemImage(item, fallbackImage),
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      seasonNumber: seasonNumber ? parseInt(seasonNumber, 10) : undefined,
      showNotes,
      title: this.findText(item, ["title"]) || "Untitled Episode",
    };
  }
}
