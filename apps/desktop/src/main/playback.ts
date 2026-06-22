import { pathToFileURL } from "node:url";

import type { PlaybackProgressInput, PlaybackSource } from "../shared/types";
import type { LocalDatabase } from "./db";

export class PlaybackService {
  constructor(private readonly db: LocalDatabase) {}

  async getSource(episodeId: string): Promise<PlaybackSource> {
    const episode = this.db.getEpisode(episodeId);
    if (!episode) {
      throw new Error("Episode not found");
    }

    if (episode.downloadedPath) {
      return {
        episodeId,
        isLocal: true,
        source: pathToFileURL(episode.downloadedPath).toString(),
      };
    }

    return {
      episodeId,
      isLocal: false,
      source: episode.audioUrl,
    };
  }

  async saveProgress(progress: PlaybackProgressInput): Promise<void> {
    const episode = this.db.getEpisode(progress.episodeId);
    const podcast = this.db.getPodcast(progress.podcastId);
    if (!episode || !podcast) {
      throw new Error("Episode not found");
    }

    this.db.savePlaybackProgress(progress);
    const now = new Date().toISOString();
    this.db.appendOutbox("playback.checkpoint", {
      currentTime: progress.currentTime,
      duration: progress.duration,
      isCompleted: progress.isCompleted,
      lastPlayedAt: now,
      locator: {
        audioUrl: episode.audioUrl,
        episodeGuid: episode.guid,
        feedUrl: podcast.feedUrl,
      },
      updatedAt: now,
    });
  }
}
