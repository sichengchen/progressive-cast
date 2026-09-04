import { getCachedImageUrl } from "@/lib/image-cache";

const loadedUrls = new Set<string>();
const queuedUrls = new Set<string>();
const queue: string[] = [];
let activeLoads = 0;

const maxConcurrentLoads = 6;

export function preloadImageUrls(
  urls: Array<string | undefined>,
  options: { immediate?: boolean; limit?: number } = {},
) {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return;
  }

  const uniqueUrls = uniqueImageUrls(urls.map(getCachedImageUrl), options.limit);
  if (uniqueUrls.length === 0) {
    return;
  }

  const enqueue = () => {
    for (const url of uniqueUrls) {
      if (loadedUrls.has(url) || queuedUrls.has(url)) {
        continue;
      }

      queuedUrls.add(url);
      queue.push(url);
    }

    pumpQueue();
  };

  if (options.immediate) {
    enqueue();
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(enqueue, { timeout: 1500 });
    return;
  }

  globalThis.setTimeout(enqueue, 0);
}

function uniqueImageUrls(urls: Array<string | undefined>, limit?: number) {
  const uniqueUrls: string[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    uniqueUrls.push(url);

    if (limit && uniqueUrls.length >= limit) {
      break;
    }
  }

  return uniqueUrls;
}

function pumpQueue() {
  while (activeLoads < maxConcurrentLoads && queue.length > 0) {
    const url = queue.shift();
    if (!url) {
      continue;
    }

    activeLoads += 1;
    void loadImage(url)
      .then(() => {
        loadedUrls.add(url);
      })
      .catch(() => undefined)
      .finally(() => {
        activeLoads -= 1;
        queuedUrls.delete(url);
        pumpQueue();
      });
  }
}

async function loadImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;

  if (image.decode) {
    await image.decode();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
  });
}
