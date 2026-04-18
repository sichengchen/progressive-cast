import Dexie, { type EntityTable } from "dexie";
import type { Podcast, Episode, PlaybackProgress, DownloadProgress, DownloadQueue } from "./types";
import type { SyncOutboxItem } from "./sync/types";

export interface PodcastDB {
  podcasts: EntityTable<Podcast, "id">;
  episodes: EntityTable<Episode, "id">;
  playbackProgress: EntityTable<PlaybackProgress, "id">;
  downloadProgress: EntityTable<DownloadProgress, "episodeId">;
  downloadQueue: EntityTable<DownloadQueue, "id">;
  audioFiles: EntityTable<{ key: string; blob: Blob; size: number; createdAt: Date }, "key">;
  syncOutbox: EntityTable<SyncOutboxItem, "id">;
}

const db = new Dexie("PodcastPlayerDB") as Dexie & PodcastDB;

// Define schemas with optimized indexes for performance
db.version(1).stores({
  podcasts: "&id, title, feedUrl, subscriptionDate, lastUpdated",
  episodes: "&id, podcastId, title, publishedAt, audioUrl",
  playbackProgress: "&id, episodeId, podcastId, lastPlayedAt, isCompleted",
});

// Add compound indexes for better query performance
db.version(2).stores({
  podcasts: "&id, title, feedUrl, subscriptionDate, lastUpdated",
  episodes: "&id, podcastId, title, publishedAt, audioUrl, [publishedAt+podcastId]", // Compound index for latest episodes query
  playbackProgress: "&id, episodeId, podcastId, lastPlayedAt, isCompleted",
});

// Add compound indexes for better query performance
db.version(3).stores({
  podcasts: "&id, title, feedUrl, subscriptionDate, lastUpdated",
  episodes: "&id, podcastId, title, publishedAt, audioUrl, [publishedAt+podcastId], isDownloaded", // Added isDownloaded index
  playbackProgress: "&id, episodeId, podcastId, lastPlayedAt, isCompleted",
  downloadProgress: "&episodeId, status, startedAt",
  downloadQueue: "&id, episodeId, priority, status, addedAt",
  audioFiles: "&key, size, createdAt",
});

db.version(4).stores({
  podcasts: "&id, title, feedUrl, subscriptionDate, lastUpdated",
  episodes:
    "&id, podcastId, title, publishedAt, audioUrl, guid, [publishedAt+podcastId], isDownloaded",
  playbackProgress: "&id, episodeId, podcastId, lastPlayedAt, isCompleted",
  downloadProgress: "&episodeId, status, startedAt",
  downloadQueue: "&id, episodeId, priority, status, addedAt",
  audioFiles: "&key, size, createdAt",
  syncOutbox: "&id, kind, updatedAt",
});

function mergePodcastRecord(existing: Podcast | undefined, incoming: Podcast): Podcast {
  if (!existing) {
    return incoming;
  }

  if (existing.feedUrl !== incoming.feedUrl) {
    throw new Error(`Podcast ID collision detected for ${incoming.feedUrl}.`);
  }

  return {
    ...existing,
    ...incoming,
    subscriptionDate: existing.subscriptionDate,
  };
}

function mergeEpisodeRecord(existing: Episode | undefined, incoming: Episode): Episode {
  if (!existing) {
    return incoming;
  }

  if (existing.podcastId !== incoming.podcastId || existing.audioUrl !== incoming.audioUrl) {
    throw new Error(`Episode ID collision detected for ${incoming.title}.`);
  }

  return {
    ...existing,
    ...incoming,
    downloadedAt: existing.downloadedAt ?? incoming.downloadedAt,
    downloadedPath: existing.downloadedPath ?? incoming.downloadedPath,
    fileSize: existing.fileSize ?? incoming.fileSize,
    isDownloaded: existing.isDownloaded ?? incoming.isDownloaded,
  };
}

function mergeIncomingPodcasts(podcasts: Podcast[]): Podcast[] {
  const merged = new Map<string, Podcast>();

  for (const podcast of podcasts) {
    const existing = merged.get(podcast.id);
    merged.set(podcast.id, mergePodcastRecord(existing, podcast));
  }

  return [...merged.values()];
}

function mergeIncomingEpisodes(episodes: Episode[]): Episode[] {
  const merged = new Map<string, Episode>();

  for (const episode of episodes) {
    const existing = merged.get(episode.id);
    merged.set(episode.id, mergeEpisodeRecord(existing, episode));
  }

  return [...merged.values()];
}

async function putPodcasts(podcasts: Podcast[]): Promise<void> {
  const uniquePodcasts = mergeIncomingPodcasts(podcasts);
  if (uniquePodcasts.length === 0) {
    return;
  }

  const existingPodcasts = await db.podcasts.bulkGet(uniquePodcasts.map((podcast) => podcast.id));
  const mergedPodcasts = uniquePodcasts.map((podcast, index) =>
    mergePodcastRecord(existingPodcasts[index], podcast),
  );

  await db.podcasts.bulkPut(mergedPodcasts);
}

async function putEpisodes(episodes: Episode[]): Promise<void> {
  const uniqueEpisodes = mergeIncomingEpisodes(episodes);
  if (uniqueEpisodes.length === 0) {
    return;
  }

  const existingEpisodes = await db.episodes.bulkGet(uniqueEpisodes.map((episode) => episode.id));
  const mergedEpisodes = uniqueEpisodes.map((episode, index) =>
    mergeEpisodeRecord(existingEpisodes[index], episode),
  );

  await db.episodes.bulkPut(mergedEpisodes);
}

export class DatabaseService {
  // Podcast operations
  static async addPodcast(podcast: Podcast): Promise<void> {
    await putPodcasts([podcast]);
  }

  static async getPodcasts(): Promise<Podcast[]> {
    return await db.podcasts.orderBy("subscriptionDate").reverse().toArray();
  }

  static async getPodcastById(id: string): Promise<Podcast | undefined> {
    return await db.podcasts.get(id);
  }

  static async updatePodcast(id: string, updates: Partial<Podcast>): Promise<void> {
    await db.podcasts.update(id, updates);
  }

  static async deletePodcast(id: string): Promise<void> {
    // Delete podcast and all its episodes and progress
    await db.transaction("rw", db.podcasts, db.episodes, db.playbackProgress, async () => {
      await db.podcasts.delete(id);
      await db.episodes.where("podcastId").equals(id).delete();
      await db.playbackProgress.where("podcastId").equals(id).delete();
    });
  }

  // Episode operations
  static async addEpisodes(episodes: Episode[]): Promise<void> {
    await putEpisodes(episodes);
  }

  // Optimized method for getting latest episodes across all podcasts
  static async getLatestEpisodesOptimized(limit: number = 10): Promise<Episode[]> {
    // Single query to get latest episodes across all podcasts, sorted by publishedAt
    return await db.episodes.orderBy("publishedAt").reverse().limit(limit).toArray();
  }

  static async getEpisodesByPodcastId(podcastId: string): Promise<Episode[]> {
    return await db.episodes
      .orderBy("publishedAt")
      .reverse()
      .filter((episode) => episode.podcastId === podcastId)
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
    return await db.playbackProgress.where("podcastId").equals(podcastId).toArray();
  }

  static async markEpisodeCompleted(episodeId: string, podcastId: string): Promise<void> {
    const progressId = `${episodeId}_progress`;
    const existing = await db.playbackProgress.get(progressId);
    await db.playbackProgress.put({
      id: progressId,
      episodeId,
      podcastId,
      currentTime: existing?.duration ?? existing?.currentTime ?? 0,
      duration: existing?.duration ?? 0,
      lastPlayedAt: new Date(),
      isCompleted: true,
    });
  }

  static async clearPlaybackProgress(): Promise<void> {
    await db.playbackProgress.clear();
  }

  // Search operations
  static async searchPodcasts(query: string): Promise<Podcast[]> {
    const lowerQuery = query.toLowerCase();
    return await db.podcasts
      .filter(
        (podcast) =>
          podcast.title.toLowerCase().includes(lowerQuery) ||
          podcast.description.toLowerCase().includes(lowerQuery) ||
          (podcast.author?.toLowerCase().includes(lowerQuery) ?? false),
      )
      .toArray();
  }

  static async searchEpisodes(query: string, podcastId?: string): Promise<Episode[]> {
    const lowerQuery = query.toLowerCase();
    let collection = db.episodes.filter(
      (episode) =>
        episode.title.toLowerCase().includes(lowerQuery) ||
        episode.description.toLowerCase().includes(lowerQuery),
    );

    if (podcastId) {
      collection = collection.and((episode) => episode.podcastId === podcastId);
    }

    return await collection.toArray();
  }

  // Utility operations
  static async clearAllData(): Promise<void> {
    await db.transaction(
      "rw",
      db.podcasts,
      db.episodes,
      db.playbackProgress,
      db.syncOutbox,
      async () => {
        await db.podcasts.clear();
        await db.episodes.clear();
        await db.playbackProgress.clear();
        await db.syncOutbox.clear();
      },
    );
  }

  static async exportData(): Promise<{
    podcasts: Podcast[];
    episodes: Episode[];
    playbackProgress: PlaybackProgress[];
  }> {
    const [podcasts, episodes, playbackProgress] = await Promise.all([
      db.podcasts.toArray(),
      db.episodes.toArray(),
      db.playbackProgress.toArray(),
    ]);

    return { podcasts, episodes, playbackProgress };
  }

  static async importData(data: {
    podcasts: Podcast[];
    episodes: Episode[];
    playbackProgress: PlaybackProgress[];
  }): Promise<void> {
    await db.transaction("rw", db.podcasts, db.episodes, db.playbackProgress, async () => {
      await putPodcasts(data.podcasts);
      await putEpisodes(data.episodes);
      await db.playbackProgress.bulkPut(data.playbackProgress);
    });
  }

  // Download-related operations
  static async saveAudioFile(key: string, blob: Blob): Promise<void> {
    await db.audioFiles.put({
      key,
      blob,
      size: blob.size,
      createdAt: new Date(),
    });
  }

  static async getAudioFile(key: string): Promise<Blob | undefined> {
    const record = await db.audioFiles.get(key);
    return record?.blob;
  }

  static async deleteAudioFile(key: string): Promise<void> {
    await db.audioFiles.delete(key);
  }

  static async markEpisodeAsDownloaded(
    episodeId: string,
    localPath: string,
    fileSize: number,
  ): Promise<void> {
    await db.episodes.update(episodeId, {
      isDownloaded: true,
      downloadedPath: localPath,
      downloadedAt: new Date(),
      fileSize,
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
      fileSize: undefined,
    });
  }

  static async getDownloadedEpisodes(): Promise<Episode[]> {
    return await db.episodes.filter((episode) => episode.isDownloaded === true).toArray();
  }

  static async getStorageStats(): Promise<{
    totalSize: number;
    downloadedEpisodes: number;
  }> {
    const downloadedEpisodes = await this.getDownloadedEpisodes();
    const totalSize = downloadedEpisodes.reduce((sum, episode) => sum + (episode.fileSize || 0), 0);

    return {
      totalSize,
      downloadedEpisodes: downloadedEpisodes.length,
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

  static async putSyncOutboxItem(item: SyncOutboxItem): Promise<void> {
    await db.syncOutbox.put(item);
  }

  static async getSyncOutboxItems(): Promise<SyncOutboxItem[]> {
    return await db.syncOutbox.orderBy("updatedAt").toArray();
  }

  static async deleteSyncOutboxItem(id: string): Promise<void> {
    await db.syncOutbox.delete(id);
  }

  static async clearSyncOutbox(): Promise<void> {
    await db.syncOutbox.clear();
  }

  // Download queue operations
  static async addToDownloadQueue(queueItem: DownloadQueue): Promise<void> {
    await db.downloadQueue.add(queueItem);
  }

  static async getDownloadQueue(): Promise<DownloadQueue[]> {
    return await db.downloadQueue.orderBy("priority").reverse().toArray();
  }

  static async updateDownloadQueueStatus(
    id: string,
    status: DownloadQueue["status"],
  ): Promise<void> {
    await db.downloadQueue.update(id, { status });
  }

  static async removeFromDownloadQueue(id: string): Promise<void> {
    await db.downloadQueue.delete(id);
  }

  static async clearAllDownloads(): Promise<void> {
    await db.transaction(
      "rw",
      db.episodes,
      db.audioFiles,
      db.downloadProgress,
      db.downloadQueue,
      async () => {
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
            fileSize: undefined,
          });
        }

        // Clear download progress and queue
        await db.downloadProgress.clear();
        await db.downloadQueue.clear();
      },
    );
  }
}

export async function resetDatabaseForTests(): Promise<void> {
  db.close();
  await Dexie.delete(db.name);
  await db.open();
}
