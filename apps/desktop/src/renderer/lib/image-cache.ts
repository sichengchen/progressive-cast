const cachedImageOrigin = "rajio-image://cache";

export function getCachedImageUrl(sourceUrl?: string): string | undefined {
  if (!sourceUrl || typeof window === "undefined" || !window.newcastle) {
    return sourceUrl;
  }

  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return sourceUrl;
    }

    return `${cachedImageOrigin}?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return sourceUrl;
  }
}
