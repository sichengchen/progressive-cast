import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const maxImageBytes = 12 * 1024 * 1024;
const defaultMaxMemoryBytes = 48 * 1024 * 1024;
const defaultMaxMemoryEntries = 128;
const defaultWarmConcurrency = 8;

const imageRequestHeaders = {
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "User-Agent": "Rajio/0.9.0 (Desktop Podcast Player)",
};

interface CacheMetadata {
  contentType: string;
  sourceUrl: string;
}

export interface CachedImage {
  bytes: Buffer;
  contentType: string;
}

type ImageFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface ImageCacheOptions {
  maxMemoryBytes?: number;
  maxMemoryEntries?: number;
}

export interface ImageWarmResult {
  failed: number;
  loaded: number;
}

export class ImageCacheService {
  private readonly memoryCache = new Map<string, CachedImage>();
  private readonly pending = new Map<string, Promise<CachedImage>>();
  private memoryCacheBytes = 0;

  constructor(
    private readonly cacheDirectory: string,
    private readonly fetchImage: ImageFetcher = fetch,
    private readonly options: ImageCacheOptions = {},
  ) {}

  get(sourceUrl: string): Promise<CachedImage> {
    const normalizedUrl = normalizeRemoteImageUrl(sourceUrl);
    const memoryCached = this.memoryCache.get(normalizedUrl);
    if (memoryCached) {
      this.memoryCache.delete(normalizedUrl);
      this.memoryCache.set(normalizedUrl, memoryCached);
      return Promise.resolve(memoryCached);
    }

    const currentRequest = this.pending.get(normalizedUrl);
    if (currentRequest) {
      return currentRequest;
    }

    const request = this.loadOrFetch(normalizedUrl)
      .then((image) => {
        this.remember(normalizedUrl, image);
        return image;
      })
      .finally(() => {
        this.pending.delete(normalizedUrl);
      });
    this.pending.set(normalizedUrl, request);
    return request;
  }

  async warm(
    sourceUrls: readonly string[],
    options: { concurrency?: number } = {},
  ): Promise<ImageWarmResult> {
    const urls = [...new Set(sourceUrls)].filter(Boolean);
    if (urls.length === 0) {
      return { failed: 0, loaded: 0 };
    }

    const concurrency = Math.max(
      1,
      Math.min(Math.floor(options.concurrency ?? defaultWarmConcurrency), urls.length),
    );
    let cursor = 0;
    let failed = 0;
    let loaded = 0;

    const worker = async () => {
      while (cursor < urls.length) {
        const url = urls[cursor];
        cursor += 1;

        try {
          await this.get(url);
          loaded += 1;
        } catch {
          failed += 1;
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    return { failed, loaded };
  }

  private remember(sourceUrl: string, image: CachedImage): void {
    const maxMemoryBytes = this.options.maxMemoryBytes ?? defaultMaxMemoryBytes;
    const maxMemoryEntries = this.options.maxMemoryEntries ?? defaultMaxMemoryEntries;

    if (maxMemoryBytes <= 0 || maxMemoryEntries <= 0 || image.bytes.byteLength > maxMemoryBytes) {
      return;
    }

    const previous = this.memoryCache.get(sourceUrl);
    if (previous) {
      this.memoryCacheBytes -= previous.bytes.byteLength;
      this.memoryCache.delete(sourceUrl);
    }

    this.memoryCache.set(sourceUrl, image);
    this.memoryCacheBytes += image.bytes.byteLength;

    while (
      this.memoryCache.size > maxMemoryEntries ||
      this.memoryCacheBytes > maxMemoryBytes
    ) {
      const oldestUrl = this.memoryCache.keys().next().value;
      if (typeof oldestUrl !== "string") {
        break;
      }

      const oldestImage = this.memoryCache.get(oldestUrl);
      this.memoryCache.delete(oldestUrl);
      this.memoryCacheBytes -= oldestImage?.bytes.byteLength ?? 0;
    }
  }

  private async loadOrFetch(sourceUrl: string): Promise<CachedImage> {
    const cacheKey = createHash("sha256").update(sourceUrl).digest("hex");
    const bodyPath = path.join(this.cacheDirectory, `${cacheKey}.bin`);
    const metadataPath = path.join(this.cacheDirectory, `${cacheKey}.json`);
    const cached = await readCachedImage(bodyPath, metadataPath, sourceUrl);
    if (cached) {
      return cached;
    }

    const response = await this.fetchImage(sourceUrl, { headers: imageRequestHeaders });
    if (!response.ok) {
      throw new Error(`Image request failed with HTTP ${response.status}`);
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxImageBytes) {
      throw new Error("Image exceeds the cache size limit");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > maxImageBytes) {
      throw new Error("Image exceeds the cache size limit");
    }

    const contentType = resolveImageContentType(response.headers.get("content-type"), bytes);
    if (!contentType) {
      throw new Error("Response is not a supported image");
    }

    await mkdir(this.cacheDirectory, { recursive: true });
    const temporarySuffix = `${process.pid}-${Date.now()}`;
    const temporaryBodyPath = `${bodyPath}.${temporarySuffix}.tmp`;
    const temporaryMetadataPath = `${metadataPath}.${temporarySuffix}.tmp`;
    const metadata: CacheMetadata = { contentType, sourceUrl };

    await Promise.all([
      writeFile(temporaryBodyPath, bytes),
      writeFile(temporaryMetadataPath, JSON.stringify(metadata)),
    ]);
    await rename(temporaryBodyPath, bodyPath);
    await rename(temporaryMetadataPath, metadataPath);

    return { bytes, contentType };
  }
}

async function readCachedImage(
  bodyPath: string,
  metadataPath: string,
  sourceUrl: string,
): Promise<CachedImage | null> {
  try {
    const [bytes, serializedMetadata] = await Promise.all([
      readFile(bodyPath),
      readFile(metadataPath, "utf8"),
    ]);
    const metadata = JSON.parse(serializedMetadata) as Partial<CacheMetadata>;
    if (
      metadata.sourceUrl !== sourceUrl ||
      typeof metadata.contentType !== "string" ||
      !metadata.contentType.startsWith("image/")
    ) {
      return null;
    }

    return { bytes, contentType: metadata.contentType };
  } catch {
    return null;
  }
}

function normalizeRemoteImageUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP image URLs can be cached");
  }

  return url.toString();
}

function resolveImageContentType(header: string | null, bytes: Buffer): string | null {
  const declaredType = header?.split(";", 1)[0]?.trim().toLowerCase();
  if (declaredType?.startsWith("image/")) {
    return declaredType;
  }

  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  const gifHeader = bytes.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return "image/gif";
  }
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}
