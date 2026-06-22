import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DownloadStatus } from "../shared/types";
import type { LocalDatabase } from "./db";

export class DownloadService {
  constructor(
    private readonly db: LocalDatabase,
    private readonly downloadsDir: string,
  ) {}

  async start(episodeId: string): Promise<DownloadStatus> {
    const episode = this.db.getEpisode(episodeId);
    if (!episode) {
      return {
        episodeId,
        progress: 0,
        status: "missing",
      };
    }

    this.db.saveDownloadStatus({
      episodeId,
      progress: 0,
      status: "downloading",
    });

    try {
      const response = await fetch(episode.audioUrl);
      if (!response.ok) {
        throw new Error(`Download failed with HTTP ${response.status}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      await mkdir(this.downloadsDir, { recursive: true });
      const filePath = path.join(this.downloadsDir, `${episode.id}${extensionFromUrl(episode.audioUrl)}`);
      await writeFile(filePath, bytes);

      this.db.markEpisodeDownloaded(episode.id, filePath, bytes.byteLength);
      return this.db.getDownloadStatus(episode.id);
    } catch (error) {
      const status: DownloadStatus = {
        episodeId,
        error: error instanceof Error ? error.message : "Download failed",
        progress: 0,
        status: "failed",
      };
      this.db.saveDownloadStatus(status);
      return status;
    }
  }

  async delete(episodeId: string): Promise<void> {
    const episode = this.db.getEpisode(episodeId);
    if (episode?.downloadedPath) {
      await rm(episode.downloadedPath, { force: true });
    }

    this.db.clearDownloadedEpisode(episodeId);
  }
}

function extensionFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname);
  return extension || ".mp3";
}
