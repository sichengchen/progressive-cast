import { protocol } from "electron";

import { ImageCacheService } from "./image-cache";

export const imageCacheScheme = "rajio-image";

export function registerImageCacheProtocol(cacheDirectory: string): ImageCacheService {
  const imageCache = new ImageCacheService(cacheDirectory);

  protocol.handle(imageCacheScheme, async (request) => {
    if (request.method !== "GET") {
      return new Response(null, { status: 405 });
    }

    const sourceUrl = new URL(request.url).searchParams.get("url");
    if (!sourceUrl) {
      return new Response(null, { status: 400 });
    }

    try {
      const image = await imageCache.get(sourceUrl);
      return new Response(new Uint8Array(image.bytes), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(image.bytes.byteLength),
          "Content-Type": image.contentType,
        },
      });
    } catch {
      return new Response(null, { status: 502 });
    }
  });

  return imageCache;
}
