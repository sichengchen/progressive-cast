import { XMLParser } from "fast-xml-parser";

import type { EpisodeSummary, PodcastSummary } from "../shared/types";

interface ParsedFeed {
  episodes: EpisodeSummary[];
  podcast: PodcastSummary;
}

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  attributeNamePrefix: "",
  cdataPropName: "#cdata",
  ignoreAttributes: false,
  parseTagValue: false,
  textNodeName: "#text",
  trimValues: true,
});

export class RssService {
  async fetchFeed(feedUrl: string): Promise<ParsedFeed> {
    const normalizedFeedUrl = new URL(feedUrl).toString();
    const response = await fetch(normalizedFeedUrl, {
      headers: {
        "User-Agent": "Newcastle/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Feed request failed with HTTP ${response.status}`);
    }

    return this.parseFeed(normalizedFeedUrl, await response.text());
  }

  parseFeed(feedUrl: string, xml: string): ParsedFeed {
    if (!xml.trim()) {
      throw new Error("RSS feed is empty");
    }

    const document = parser.parse(xml) as XmlNode;
    const root = selectObject(document, ["rss", "rdf:RDF", "feed"]) ?? document;
    const channel = selectObject(root, ["channel", "feed"]) ?? root;
    const items = selectArray(channel, ["item", "entry"]);
    const now = new Date().toISOString();
    const podcastId = generatePodcastId(feedUrl);
    const feedImage = extractImage(channel);

    const podcast: PodcastSummary = {
      author: firstText(channel, ["itunes:author", "author", "managingEditor"]),
      description: toPlainText(firstText(channel, ["description", "subtitle", "summary"])) ?? "",
      feedUrl,
      id: podcastId,
      imageUrl: feedImage,
      language: firstText(channel, ["language"]),
      lastUpdated: now,
      subscriptionDate: now,
      title: firstText(channel, ["title"]) ?? new URL(feedUrl).hostname,
    };

    const episodes = items
      .map((item, index) => toEpisodeSummary(item, podcastId, index, feedImage))
      .filter((episode) => episode.audioUrl.length > 0);

    return { episodes, podcast };
  }
}

function toEpisodeSummary(
  item: XmlNode,
  podcastId: string,
  index: number,
  fallbackImage?: string,
): EpisodeSummary {
  const audioUrl = extractAudioUrl(item);
  const guid = firstText(item, ["guid", "id"]);

  return {
    audioUrl,
    content: firstText(item, ["content:encoded", "content", "summary", "description"]),
    description: toPlainText(firstText(item, ["description", "summary", "content"])) ?? "",
    duration: parseDuration(firstText(item, ["itunes:duration", "duration"])),
    guid,
    id: generateEpisodeId(podcastId, audioUrl || guid || String(index), index),
    imageUrl: extractImage(item) ?? fallbackImage,
    podcastId,
    publishedAt: parseDate(firstText(item, ["pubDate", "published", "updated"])),
    title: firstText(item, ["title"]) ?? "Untitled Episode",
  };
}

function selectObject(root: XmlNode, names: string[]): XmlNode | undefined {
  for (const name of names) {
    const value = root[name];
    if (isObject(value)) {
      return value;
    }
  }

  return undefined;
}

function selectArray(root: XmlNode, names: string[]): XmlNode[] {
  for (const name of names) {
    const value = root[name];
    if (Array.isArray(value)) {
      return value.filter(isObject);
    }
    if (isObject(value)) {
      return [value];
    }
  }

  return [];
}

function firstText(root: XmlNode, names: string[]): string | undefined {
  for (const name of names) {
    const value = root[name];
    const text = textValue(value);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (isObject(value)) {
    return textValue(value["#cdata"]) ?? textValue(value["#text"]) ?? textValue(value.href);
  }

  return undefined;
}

function extractAudioUrl(item: XmlNode): string {
  const enclosure = item.enclosure;
  if (Array.isArray(enclosure)) {
    const match = enclosure.find(isObject);
    const url = match ? textValue(match.url) : undefined;
    if (url) {
      return url;
    }
  }

  if (isObject(enclosure)) {
    const url = textValue(enclosure.url);
    if (url) {
      return url;
    }
  }

  const links = selectArray(item, ["link"]);
  for (const link of links) {
    if (textValue(link.rel) === "enclosure") {
      const href = textValue(link.href);
      if (href) {
        return href;
      }
    }
  }

  const media = selectArray(item, ["media:content", "content"]);
  for (const entry of media) {
    const url = textValue(entry.url);
    if (url) {
      return url;
    }
  }

  return firstText(item, ["link"]) ?? "";
}

function extractImage(root: XmlNode): string | undefined {
  const image = root["itunes:image"] ?? root["media:thumbnail"] ?? root.image;
  if (isObject(image)) {
    return textValue(image.href) ?? textValue(image.url);
  }

  if (Array.isArray(image)) {
    for (const entry of image) {
      if (isObject(entry)) {
        const value = textValue(entry.href) ?? textValue(entry.url);
        if (value) {
          return value;
        }
      }
    }
  }

  return textValue(image);
}

function parseDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function parseDuration(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const segments = value.split(":").map((segment) => Number(segment));
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

function toPlainText(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const stripped = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped || undefined;
}

function generatePodcastId(feedUrl: string): string {
  return `podcast_${hash(feedUrl)}`;
}

function generateEpisodeId(podcastId: string, audioUrl: string, index: number): string {
  return `episode_${hash(`${podcastId}:${audioUrl}:${index}`)}`;
}

function hash(value: string): string {
  let hashValue = 0;
  for (let index = 0; index < value.length; index += 1) {
    hashValue = (hashValue << 5) - hashValue + value.charCodeAt(index);
    hashValue |= 0;
  }

  return String(Math.abs(hashValue));
}

function isObject(value: unknown): value is XmlNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
