export interface iTunesPodcast {
  id: string;
  title: string;
  author: string;
  description: string;
  imageUrl: string;
  feedUrl: string;
  genre: string;
  trackCount: number;
  releaseDate: string;
  country: string;
  language: string;
  itunesUrl: string;
  explicit: boolean;
}

export interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesPodcast[];
}

export class iTunesService {
  static async searchPodcasts(term: string, limit: number = 10): Promise<iTunesSearchResponse> {
    try {
      const apiUrl = new URL("https://itunes.apple.com/search");
      apiUrl.searchParams.set("term", term);
      apiUrl.searchParams.set("media", "podcast");
      apiUrl.searchParams.set("entity", "podcast");
      apiUrl.searchParams.set("limit", String(limit));

      const response = await fetch(apiUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorData: { error?: string };
        try {
          errorData = (await response.json()) as { error?: string };
        } catch {
          const textContent = await response.text();
          errorData = {
            error: textContent || `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as {
        resultCount: number;
        results: Array<{
          artistName?: string;
          artworkUrl600?: string;
          collectionCensoredName?: string;
          collectionExplicitness?: string;
          collectionId?: number;
          collectionName?: string;
          collectionViewUrl?: string;
          country?: string;
          feedUrl?: string;
          genres?: string[];
          primaryGenreName?: string;
          releaseDate?: string;
          trackCount?: number;
        }>;
      };

      return {
        resultCount: data.resultCount,
        results: data.results
          .filter((result) => result.feedUrl)
          .map((result) => ({
            author: result.artistName ?? "",
            country: result.country ?? "",
            description: result.primaryGenreName ?? "",
            explicit: result.collectionExplicitness === "explicit",
            feedUrl: result.feedUrl ?? "",
            genre: result.primaryGenreName ?? result.genres?.[0] ?? "",
            id: String(result.collectionId ?? result.feedUrl),
            imageUrl: result.artworkUrl600 ?? "",
            itunesUrl: result.collectionViewUrl ?? "",
            language: "",
            releaseDate: result.releaseDate ?? "",
            title: result.collectionName ?? result.collectionCensoredName ?? "",
            trackCount: result.trackCount ?? 0,
          })),
      };
    } catch (error) {
      console.error("iTunes search error:", error);
      throw error;
    }
  }

  static async searchPodcastsWithDelay(
    term: string,
    limit: number = 10,
  ): Promise<iTunesSearchResponse> {
    // debounce
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await this.searchPodcasts(term, limit);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 300); // 300ms delay
    });
  }
}
