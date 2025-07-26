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
      const apiUrl = `/api/itunes-search?term=${encodeURIComponent(term)}&limit=${limit}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const textContent = await response.text();
          errorData = { error: textContent || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('iTunes search error:', error);
      throw error;
    }
  }

  static async searchPodcastsWithDelay(term: string, limit: number = 10): Promise<iTunesSearchResponse> {
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