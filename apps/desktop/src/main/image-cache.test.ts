import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ImageCacheService } from "./image-cache";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

test("persists images on disk and reuses them across service instances", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rajio-image-cache-"));
  let requestCount = 0;
  const firstService = new ImageCacheService(root, async () => {
    requestCount += 1;
    return new Response(pngBytes, {
      headers: { "Content-Type": "image/png" },
      status: 200,
    });
  });

  try {
    const first = await firstService.get("https://cdn.example/show.png");
    assert.equal(first.contentType, "image/png");
    assert.deepEqual(first.bytes, Buffer.from(pngBytes));

    const secondService = new ImageCacheService(root, async () => {
      throw new Error("The persisted image should be read without another request");
    });
    const second = await secondService.get("https://cdn.example/show.png");

    assert.equal(requestCount, 1);
    assert.deepEqual(second, first);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("deduplicates concurrent requests for the same image", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rajio-image-cache-"));
  let requestCount = 0;
  const service = new ImageCacheService(root, async () => {
    requestCount += 1;
    return new Response(pngBytes, { status: 200 });
  });

  try {
    const [first, second] = await Promise.all([
      service.get("https://cdn.example/episode.png"),
      service.get("https://cdn.example/episode.png"),
    ]);

    assert.equal(requestCount, 1);
    assert.deepEqual(second, first);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("keeps warmed images in memory after the disk entry is removed", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rajio-image-cache-"));
  const service = new ImageCacheService(root, async () => new Response(pngBytes, { status: 200 }));

  try {
    const sourceUrl = "https://cdn.example/warmed.png";
    await service.get(sourceUrl);
    rmSync(root, { force: true, recursive: true });

    const cached = await service.get(sourceUrl);
    assert.deepEqual(cached.bytes, Buffer.from(pngBytes));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("warms unique images concurrently and tolerates individual failures", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rajio-image-cache-"));
  const requestedUrls: string[] = [];
  const service = new ImageCacheService(root, async (url) => {
    requestedUrls.push(url);
    if (url.endsWith("missing.png")) {
      return new Response(null, { status: 404 });
    }
    return new Response(pngBytes, { status: 200 });
  });

  try {
    const result = await service.warm([
      "https://cdn.example/show.png",
      "https://cdn.example/episode.png",
      "https://cdn.example/show.png",
      "https://cdn.example/missing.png",
    ]);

    assert.deepEqual(result, { failed: 1, loaded: 2 });
    assert.equal(requestedUrls.length, 3);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("rejects unsupported URLs and non-image responses", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rajio-image-cache-"));
  const service = new ImageCacheService(
    root,
    async () => new Response("not an image", { status: 200 }),
  );

  try {
    assert.throws(() => service.get("file:///tmp/cover.png"), /Only HTTP image URLs/);
    await assert.rejects(service.get("https://cdn.example/not-an-image"), /not a supported image/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
