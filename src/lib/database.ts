import Dexie, { type EntityTable } from 'dexie';
import type { Podcast, Episode, PlaybackProgress, DownloadProgress, DownloadQueue } from './types';

export interface PodcastDB {
  podcasts: EntityTable<Podcast, 'id'>;
  episodes: EntityTable<Episode, 'id'>;
  playbackProgress: EntityTable<PlaybackProgress, 'id'>;
  downloadProgress: EntityTable<DownloadProgress, 'episodeId'>;
  downloadQueue: EntityTable<DownloadQueue, 'id'>;
  audioFiles: EntityTable<{ key: string; blob: Blob; size: number; createdAt: Date }, 'key'>;
}

const db = new Dexie('PodcastPlayerDB') as Dexie & PodcastDB;

// Define schemas with optimized indexes for performance
db.version(1).stores({
  podcasts: '&id, title, feedUrl, subscriptionDate, lastUpdated',
  episodes: '&id, podcastId, title, publishedAt, audioUrl',
  playbackProgress: '&id, episodeId, podcastId, lastPlayedAt, isCompleted'
});

// Add compound indexes for better query performance
db.version(2).stores({
  podcasts: '&id, title, feedUrl, subscriptionDate, lastUpdated',
  episodes: '&id, podcastId, title, publishedAt, audioUrl, [publishedAt+podcastId]', // Compound index for latest episodes query
  playbackProgress: '&id, episodeId, podcastId, lastPlayedAt, isCompleted'
});

// Add compound indexes for better query performance
db.version(3).stores({
  podcasts: '&id, title, feedUrl, subscriptionDate, lastUpdated',
  episodes: '&id, podcastId, title, publishedAt, audioUrl, [publishedAt+podcastId], isDownloaded', // Added isDownloaded index
  playbackProgress: '&id, episodeId, podcastId, lastPlayedAt, isCompleted',
  downloadProgress: '&episodeId, status, startedAt',
  downloadQueue: '&id, episodeId, priority, status, addedAt',
  audioFiles: '&key, size, createdAt'
});

export class DatabaseService {
  // Podcast operations
  static async addPodcast(podcast: Podcast): Promise<void> {
    await db.podcasts.add(podcast);
  }

  static async getPodcasts(): Promise<Podcast[]> {
    return await db.podcasts.orderBy('subscriptionDate').reverse().toArray();
  }

  static async getPodcastById(id: string): Promise<Podcast | undefined> {
    return await db.podcasts.get(id);
  }

  static async updatePodcast(id: string, updates: Partial<Podcast>): Promise<void> {
    await db.podcasts.update(id, updates);
  }

  static async deletePodcast(id: string): Promise<void> {
    // Delete podcast and all its episodes and progress
    await db.transaction('rw', db.podcasts, db.episodes, db.playbackProgress, async () => {
      await db.podcasts.delete(id);
      await db.episodes.where('podcastId').equals(id).delete();
      await db.playbackProgress.where('podcastId').equals(id).delete();
    });
  }

  // Episode operations
  static async addEpisodes(episodes: Episode[]): Promise<void> {
    await db.episodes.bulkAdd(episodes);
  }

  // Optimized method for getting latest episodes across all podcasts
  static async getLatestEpisodesOptimized(limit: number = 10): Promise<Episode[]> {
    // Single query to get latest episodes across all podcasts, sorted by publishedAt
    return await db.episodes
      .orderBy('publishedAt')
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getEpisodesByPodcastId(podcastId: string): Promise<Episode[]> {
    return await db.episodes
      .orderBy('publishedAt')
      .reverse()
      .filter(episode => episode.podcastId === podcastId)
      .toArray();
  }

  static async getEpisodeById(id: string): Promise<Episode | undefined> {
    return await db.episodes.get(id);
  }

  static async updateEpisode(id: string, updates: Partial<Episode>): Promise<void> {
    await db.episodes.update(id, updates);
  }

  // Playback progress operations
  static async savePlaybackProgress(progress: PlaybackProgress): Promise<void> {
    await db.playbackProgress.put(progress);
  }

  static async getPlaybackProgress(episodeId: string): Promise<PlaybackProgress | undefined> {
    return await db.playbackProgress.get(episodeId);
  }

  static async getPlaybackProgressByPodcast(podcastId: string): Promise<PlaybackProgress[]> {
    return await db.playbackProgress
      .where('podcastId')
      .equals(podcastId)
      .toArray();
  }

  static async markEpisodeCompleted(episodeId: string, podcastId: string): Promise<void> {
    const progressId = `${episodeId}_progress`;
    await db.playbackProgress.put({
      id: progressId,
      episodeId,
      podcastId,
      currentTime: 0,
      duration: 0,
      lastPlayedAt: new Date(),
      isCompleted: true
    });
  }

  // Search operations
  static async searchPodcasts(query: string): Promise<Podcast[]> {
    const lowerQuery = query.toLowerCase();
    return await db.podcasts
      .filter(podcast => 
        podcast.title.toLowerCase().includes(lowerQuery) ||
        podcast.description.toLowerCase().includes(lowerQuery) ||
        (podcast.author?.toLowerCase().includes(lowerQuery) ?? false)
      )
      .toArray();
  }

  static async searchEpisodes(query: string, podcastId?: string): Promise<Episode[]> {
    const lowerQuery = query.toLowerCase();
    let collection = db.episodes.filter(episode => 
      episode.title.toLowerCase().includes(lowerQuery) ||
      episode.description.toLowerCase().includes(lowerQuery)
    );

    if (podcastId) {
      collection = collection.and(episode => episode.podcastId === podcastId);
    }

    return await collection.toArray();
  }

  // Utility operations
  static async clearAllData(): Promise<void> {
    await db.transaction('rw', db.podcasts, db.episodes, db.playbackProgress, async () => {
      await db.podcasts.clear();
      await db.episodes.clear();
      await db.playbackProgress.clear();
    });
  }

  static async exportData(): Promise<{
    podcasts: Podcast[];
    episodes: Episode[];
    playbackProgress: PlaybackProgress[];
  }> {
    const [podcasts, episodes, playbackProgress] = await Promise.all([
      db.podcasts.toArray(),
      db.episodes.toArray(),
      db.playbackProgress.toArray()
    ]);

    return { podcasts, episodes, playbackProgress };
  }

  static async importData(data: {
    podcasts: Podcast[];
    episodes: Episode[];
    playbackProgress: PlaybackProgress[];
  }): Promise<void> {
    await db.transaction('rw', db.podcasts, db.episodes, db.playbackProgress, async () => {
      await db.podcasts.bulkAdd(data.podcasts);
      await db.episodes.bulkAdd(data.episodes);
      await db.playbackProgress.bulkAdd(data.playbackProgress);
    });
  }

  // Download-related operations
  static async saveAudioFile(key: string, blob: Blob): Promise<void> {
    await db.audioFiles.put({
      key,
      blob,
      size: blob.size,
      createdAt: new Date()
    });
  }

  static async getAudioFile(key: string): Promise<Blob | undefined> {
    const record = await db.audioFiles.get(key);
    return record?.blob;
  }

  static async deleteAudioFile(key: string): Promise<void> {
    await db.audioFiles.delete(key);
  }

  static async markEpisodeAsDownloaded(episodeId: string, localPath: string, fileSize: number): Promise<void> {
    await db.episodes.update(episodeId, {
      isDownloaded: true,
      downloadedPath: localPath,
      downloadedAt: new Date(),
      fileSize
    });
  }

  static async markEpisodeAsNotDownloaded(episodeId: string): Promise<void> {
    const episode = await db.episodes.get(episodeId);
    if (episode?.downloadedPath) {
      // Delete the audio file
      await this.deleteAudioFile(episode.downloadedPath);
    }
    
    await db.episodes.update(episodeId, {
      isDownloaded: false,
      downloadedPath: undefined,
      downloadedAt: undefined,
      fileSize: undefined
    });
  }

  static async getDownloadedEpisodes(): Promise<Episode[]> {
    return await db.episodes.filter(episode => episode.isDownloaded === true).toArray();
  }

  static async getStorageStats(): Promise<{ totalSize: number; downloadedEpisodes: number }> {
    const downloadedEpisodes = await this.getDownloadedEpisodes();
    const totalSize = downloadedEpisodes.reduce((sum, episode) => sum + (episode.fileSize || 0), 0);
    
    return {
      totalSize,
      downloadedEpisodes: downloadedEpisodes.length
    };
  }

  // Download progress operations
  static async saveDownloadProgress(progress: DownloadProgress): Promise<void> {
    await db.downloadProgress.put(progress);
  }

  static async getDownloadProgress(episodeId: string): Promise<DownloadProgress | undefined> {
    return await db.downloadProgress.get(episodeId);
  }

  static async deleteDownloadProgress(episodeId: string): Promise<void> {
    await db.downloadProgress.delete(episodeId);
  }

  static async getAllDownloadProgress(): Promise<DownloadProgress[]> {
    return await db.downloadProgress.toArray();
  }

  // Download queue operations
  static async addToDownloadQueue(queueItem: DownloadQueue): Promise<void> {
    await db.downloadQueue.add(queueItem);
  }

  static async getDownloadQueue(): Promise<DownloadQueue[]> {
    return await db.downloadQueue.orderBy('priority').reverse().toArray();
  }

  static async updateDownloadQueueStatus(id: string, status: DownloadQueue['status']): Promise<void> {
    await db.downloadQueue.update(id, { status });
  }

  static async removeFromDownloadQueue(id: string): Promise<void> {
    await db.downloadQueue.delete(id);
  }

  static async clearAllDownloads(): Promise<void> {
    await db.transaction('rw', db.episodes, db.audioFiles, db.downloadProgress, db.downloadQueue, async () => {
      // Get all downloaded episodes
      const downloadedEpisodes = await this.getDownloadedEpisodes();
      
      // Delete all audio files
      await db.audioFiles.clear();
      
      // Mark all episodes as not downloaded
      for (const episode of downloadedEpisodes) {
        await db.episodes.update(episode.id, {
          isDownloaded: false,
          downloadedPath: undefined,
          downloadedAt: undefined,
          fileSize: undefined
        });
      }
      
      // Clear download progress and queue
      await db.downloadProgress.clear();
      await db.downloadQueue.clear();
    });
  }
} 