import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";

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

    const rssContent = await response.text();
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

const app = new Hono();

app.route("/api", api);

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(serverDir, "../../dist/client");

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

async function readStaticAsset(requestPath: string) {
  const normalized = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.resolve(clientDistDir, `.${normalized}`);

  if (!filePath.startsWith(clientDistDir)) {
    return null;
  }

  try {
    const contents = await readFile(filePath);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Cache-Control":
          normalized === "/index.html" ? "no-cache" : "public, max-age=31536000, immutable",
        "Content-Type": CONTENT_TYPES[path.extname(filePath)] ?? "application/octet-stream",
      },
      status: 200,
    });
  } catch {
    return null;
  }
}

app.get("*", async (c) => {
  const asset = await readStaticAsset(c.req.path);
  if (asset) {
    return asset;
  }

  const indexHtml = await readStaticAsset("/index.html");
  if (indexHtml) {
    return indexHtml;
  }

  return c.json(
    {
      error: "Client build not found. Run `pnpm --filter @pgcast/pwa build` before previewing.",
    },
    503,
  );
});

export default app;
