import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";

import api from "./api";

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
