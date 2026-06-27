import assert from "node:assert/strict";
import test from "node:test";

import { RssService } from "./rss";

test("parses RSS feeds into podcast and episode records", () => {
  const result = new RssService().parseFeed(
    "https://example.com/feed.xml",
    `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
      <channel>
        <title>Example Podcast</title>
        <description><![CDATA[<p>Example description</p>]]></description>
        <itunes:author>Example Author</itunes:author>
        <itunes:image href="https://example.com/art.jpg" />
        <item>
          <title>First Episode</title>
          <guid>episode-guid</guid>
          <pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate>
          <itunes:duration>01:02:03</itunes:duration>
          <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
        </item>
      </channel>
    </rss>`,
  );

  assert.equal(result.podcast.title, "Example Podcast");
  assert.equal(result.podcast.author, "Example Author");
  assert.equal(result.podcast.description, "Example description");
  assert.equal(result.episodes[0]?.title, "First Episode");
  assert.equal(result.episodes[0]?.duration, 3723);
  assert.equal(result.episodes[0]?.audioUrl, "https://example.com/audio.mp3");
});

test("requests feeds with podcast-compatible headers", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: string | undefined;
  let requestedHeaders: HeadersInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedHeaders = init?.headers;

    return new Response(
      `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0"><channel><title>Example Podcast</title></channel></rss>`,
      { status: 200 },
    );
  };

  try {
    await new RssService().fetchFeed("https://example.com/feed.xml");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestedUrl, "https://example.com/feed.xml");
  assert.ok(requestedHeaders);
  assert.equal(
    requestedHeaders["Accept" as keyof typeof requestedHeaders],
    "application/rss+xml, application/atom+xml;q=0.9, application/xml;q=0.8, text/xml;q=0.8, */*;q=0.5",
  );
  assert.equal(
    requestedHeaders["Accept-Language" as keyof typeof requestedHeaders],
    "en-US,en;q=0.9",
  );
  assert.equal(
    requestedHeaders["User-Agent" as keyof typeof requestedHeaders],
    "Newcastle/0.9.0 (macOS; Podcast RSS Reader)",
  );
});

test("includes HTTP status text when feed requests fail", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("", { status: 403, statusText: "Forbidden" });

  try {
    await assert.rejects(
      new RssService().fetchFeed("https://example.com/feed.xml"),
      /Feed request failed with HTTP 403 Forbidden/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
