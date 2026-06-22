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
