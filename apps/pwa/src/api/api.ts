import { Hono } from "hono";

const RSS_MAX_BYTES = 20 * 1024 * 1024;
const RSS_MAX_MB = Math.floor(RSS_MAX_BYTES / 1024 / 1024);

async function readTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");

  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (Number.isFinite(size) && size > maxBytes) {
      throw new Error(`RSS feed exceeds the ${RSS_MAX_MB} MB limit.`);
    }
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        throw new Error(`RSS feed exceeds the ${RSS_MAX_MB} MB limit.`);
      }

      result += decoder.decode(value, { stream: true });
    }

    result += decoder.decode();
    return result;
  } finally {
    reader.releaseLock();
  }
}

const api = new Hono();

api.get("/itunes-search", async (c) => {
  const term = c.req.query("term");
  const limit = c.req.query("limit") ?? "10";

  if (!term) {
    return c.json({ error: "Missing required parameter: term" }, 400);
  }

  try {
    const itunesUrl = new URL("https://itunes.apple.com/search");
    itunesUrl.searchParams.set("term", term);
    itunesUrl.searchParams.set("media", "podcast");
    itunesUrl.searchParams.set("entity", "podcast");
    itunesUrl.searchParams.set("limit", limit);
    itunesUrl.searchParams.set("country", "US");
    itunesUrl.searchParams.set("explicit", "Yes");

    const response = await fetch(itunesUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Progressive-Cast/1.0)",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return Response.json(
        {
          error: `iTunes API request failed: ${response.status} ${response.statusText}`,
        },
        {
          status: response.status,
        },
      );
    }

    const data = (await response.json()) as {
      resultCount: number;
      results?: Array<{
        artistName?: string;
        artworkUrl100?: string;
        artworkUrl600?: string;
        collectionId?: number;
        collectionName?: string;
        collectionViewUrl?: string;
        contentAdvisoryRating?: string;
        country?: string;
        description?: string;
        feedUrl?: string;
        language?: string;
        primaryGenreName?: string;
        releaseDate?: string;
        trackCount?: number;
        trackId?: number;
        trackName?: string;
        trackViewUrl?: string;
      }>;
    };

    const results =
      data.results?.map((item) => ({
        author: item.artistName,
        country: item.country,
        description: item.description ?? "",
        explicit: item.contentAdvisoryRating === "Explicit",
        feedUrl: item.feedUrl,
        genre: item.primaryGenreName,
        id: item.collectionId?.toString() ?? item.trackId?.toString(),
        imageUrl: item.artworkUrl600 ?? item.artworkUrl100,
        itunesUrl: item.collectionViewUrl ?? item.trackViewUrl,
        language: item.language,
        releaseDate: item.releaseDate,
        title: item.collectionName ?? item.trackName,
        trackCount: item.trackCount,
      })) ?? [];

    return c.json(
      {
        resultCount: data.resultCount ?? 0,
        results,
      },
      200,
      {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800",
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return c.json(
        {
          error: "Request timeout. iTunes search took too long to respond.",
        },
        408,
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: `iTunes search failed: ${message}` }, 500);
  }
});

api.get("/rss", async (c) => {
  const feedUrl = c.req.query("url");

  if (!feedUrl) {
    return c.json({ error: "Missing required parameter: url" }, 400);
  }

  try {
    const url = new URL(feedUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      return c.json(
        {
          error: "Invalid URL protocol. Only HTTP and HTTPS are allowed.",
        },
        400,
      );
    }

    const response = await fetch(feedUrl, {
      headers: {
        Accept:
          "application/rss+xml, application/xml, text/xml, application/atom+xml, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (compatible; Progressive-Cast/1.0)",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return Response.json(
        {
          error: `Failed to fetch RSS feed: ${response.status} ${response.statusText}`,
        },
        {
          status: response.status,
        },
      );
    }

    const rssContent = await readTextWithLimit(response, RSS_MAX_BYTES);
    const trimmedContent = rssContent.trim();

    if (
      !trimmedContent.startsWith("<?xml") &&
      !trimmedContent.startsWith("<rss") &&
      !trimmedContent.startsWith("<feed") &&
      (!trimmedContent.includes("<") || !trimmedContent.includes(">"))
    ) {
      return c.json({ error: "Invalid content format. Expected XML/RSS format." }, 400);
    }

    return new Response(rssContent, {
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/xml; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Invalid URL")) {
      return c.json({ error: "Invalid URL format" }, 400);
    }

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return c.json(
        {
          error: "Request timeout. The RSS feed took too long to respond.",
        },
        408,
      );
    }

    if (error instanceof Error && error.message.includes("exceeds the")) {
      return c.json({ error: error.message }, 413);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: `Failed to fetch RSS feed: ${message}` }, 500);
  }
});

api.get("/download", async (c) => {
  const url = c.req.query("url");

  if (!url) {
    return c.json({ error: "URL parameter is required" }, 400);
  }

  try {
    new URL(url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Progressive Cast Podcast App/1.0",
      },
    });

    if (!response.ok) {
      return Response.json(
        {
          error: `Failed to fetch audio: ${response.status} ${response.statusText}`,
        },
        {
          status: response.status,
        },
      );
    }

    const headers = new Headers({
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": response.headers.get("content-type") ?? "audio/mpeg",
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(response.body, {
      headers,
      status: 200,
    });
  } catch {
    return c.json({ error: "Failed to download file" }, 500);
  }
});

api.options("/*", (c) =>
  c.body(null, 200, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Origin": "*",
  }),
);

export default api;
