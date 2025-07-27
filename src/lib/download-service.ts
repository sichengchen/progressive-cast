import { DatabaseService } from "./database";
import type { Episode, DownloadProgress, DownloadQueue } from "./types";
import { cacheDownloadedAudio } from "./service-worker";

export class DownloadService {
    private static activeDownloads = new Map<string, AbortController>();
    private static downloadCallbacks = new Map<
        string,
        (progress: DownloadProgress) => void
    >();
    private static maxConcurrentDownloads = 2;
    private static isProcessingQueue = false;

    /**
     * Add an episode to the download queue
     */
    static async queueDownload(
        episode: Episode,
        priority: number = 1
    ): Promise<void> {
        // Check if already downloaded
        if (episode.isDownloaded) {
            throw new Error("Episode is already downloaded");
        }

        // Check if already in queue
        const existingQueue = await DatabaseService.getDownloadQueue();
        const alreadyQueued = existingQueue.some(
            (item) => item.episodeId === episode.id
        );

        if (alreadyQueued) {
            throw new Error("Episode is already in download queue");
        }

        const queueItem: DownloadQueue = {
            id: `queue_${episode.id}_${Date.now()}`,
            episodeId: episode.id,
            podcastId: episode.podcastId,
            priority,
            addedAt: new Date(),
            status: "queued",
        };

        await DatabaseService.addToDownloadQueue(queueItem);

        // Start processing queue if not already running
        this.processQueue();
    }

    /**
     * Process the download queue
     */
    static async processQueue(): Promise<void> {
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (true) {
                // Check how many downloads are currently active
                if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
                    break;
                }

                // Get next item from queue
                const queue = await DatabaseService.getDownloadQueue();
                const nextItem = queue.find((item) => item.status === "queued");

                if (!nextItem) {
                    break; // No more items to process
                }

                // Get episode details
                const episode = await DatabaseService.getEpisodeById(
                    nextItem.episodeId
                );
                if (!episode) {
                    await DatabaseService.removeFromDownloadQueue(nextItem.id);
                    continue;
                }

                // Update queue status and start download
                await DatabaseService.updateDownloadQueueStatus(
                    nextItem.id,
                    "downloading"
                );
                this.startDownload(episode, nextItem.id);
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Start downloading an episode
     */
    private static async startDownload(
        episode: Episode,
        queueId: string
    ): Promise<void> {
        const abortController = new AbortController();
        this.activeDownloads.set(episode.id, abortController);

        const progress: DownloadProgress = {
            episodeId: episode.id,
            progress: 0,
            status: "downloading",
            startedAt: new Date(),
        };

        try {
            await DatabaseService.saveDownloadProgress(progress);
            this.notifyProgress(episode.id, progress);

            // Download the file through proxy to avoid CORS
            const proxyUrl = `/api/download?url=${encodeURIComponent(
                episode.audioUrl
            )}`;
            const response = await fetch(proxyUrl, {
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const contentLength = response.headers.get("content-length");
            const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let downloadedSize = 0;

            // Read the response stream
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                chunks.push(value);
                downloadedSize += value.length;

                // Update progress
                const progressPercent =
                    totalSize > 0
                        ? Math.round((downloadedSize / totalSize) * 100)
                        : 0;
                const updatedProgress: DownloadProgress = {
                    ...progress,
                    progress: progressPercent,
                };

                await DatabaseService.saveDownloadProgress(updatedProgress);
                this.notifyProgress(episode.id, updatedProgress);
            }

            // Combine chunks into a single Uint8Array
            const totalLength = chunks.reduce(
                (sum, chunk) => sum + chunk.length,
                0
            );
            const combinedChunks = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of chunks) {
                combinedChunks.set(chunk, offset);
                offset += chunk.length;
            }

            // Create blob and save to database
            const mimeType = this.getMimeTypeFromUrl(episode.audioUrl);
            const blob = new Blob([combinedChunks], { type: mimeType });
            const audioKey = `audio_${episode.id}`;

            await DatabaseService.saveAudioFile(audioKey, blob);
            await DatabaseService.markEpisodeAsDownloaded(
                episode.id,
                audioKey,
                blob.size
            );

            // Cache in Service Worker for offline access
            try {
                await cacheDownloadedAudio(episode.audioUrl);
                console.log(
                    "Audio cached in Service Worker:",
                    episode.audioUrl
                );
            } catch (error) {
                console.warn("Failed to cache audio in Service Worker:", error);
                // Don't fail the download if SW caching fails
            }

            // Update progress as completed
            const completedProgress: DownloadProgress = {
                ...progress,
                progress: 100,
                status: "completed",
                completedAt: new Date(),
            };

            await DatabaseService.saveDownloadProgress(completedProgress);
            this.notifyProgress(episode.id, completedProgress);

            // Remove from queue
            await DatabaseService.updateDownloadQueueStatus(
                queueId,
                "completed"
            );
            await DatabaseService.removeFromDownloadQueue(queueId);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

            const failedProgress: DownloadProgress = {
                ...progress,
                status: "failed",
                error: errorMessage,
            };

            await DatabaseService.saveDownloadProgress(failedProgress);
            this.notifyProgress(episode.id, failedProgress);

            // Update queue status
            await DatabaseService.updateDownloadQueueStatus(queueId, "failed");
            await DatabaseService.removeFromDownloadQueue(queueId);
        } finally {
            this.activeDownloads.delete(episode.id);

            // Continue processing queue
            setTimeout(() => this.processQueue(), 100);
        }
    }

    /**
     * Cancel a download
     */
    static async cancelDownload(episodeId: string): Promise<void> {
        const abortController = this.activeDownloads.get(episodeId);
        if (abortController) {
            abortController.abort();
            this.activeDownloads.delete(episodeId);
        }

        // Remove from queue if present
        const queue = await DatabaseService.getDownloadQueue();
        const queueItem = queue.find((item) => item.episodeId === episodeId);
        if (queueItem) {
            await DatabaseService.removeFromDownloadQueue(queueItem.id);
        }

        // Update progress as cancelled
        const progress = await DatabaseService.getDownloadProgress(episodeId);
        if (progress && progress.status === "downloading") {
            await DatabaseService.saveDownloadProgress({
                ...progress,
                status: "failed",
                error: "Cancelled by user",
            });
            this.notifyProgress(episodeId, {
                ...progress,
                status: "failed",
                error: "Cancelled by user",
            });
        }
    }

    /**
     * Delete a downloaded episode
     */
    static async deleteDownload(episodeId: string): Promise<void> {
        await DatabaseService.markEpisodeAsNotDownloaded(episodeId);
        await DatabaseService.deleteDownloadProgress(episodeId);
    }

    /**
     * Get local audio URL for a downloaded episode
     */
    static async getLocalAudioUrl(episode: Episode): Promise<string | null> {
        if (!episode.isDownloaded || !episode.downloadedPath) {
            return null;
        }

        const blob = await DatabaseService.getAudioFile(episode.downloadedPath);
        if (!blob) {
            // File is missing, mark as not downloaded
            await DatabaseService.markEpisodeAsNotDownloaded(episode.id);
            return null;
        }

        return URL.createObjectURL(blob);
    }

    /**
     * Subscribe to download progress updates
     */
    static onProgress(
        episodeId: string,
        callback: (progress: DownloadProgress) => void
    ): () => void {
        this.downloadCallbacks.set(episodeId, callback);

        // Return unsubscribe function
        return () => {
            this.downloadCallbacks.delete(episodeId);
        };
    }

    /**
     * Notify progress to subscribers
     */
    private static notifyProgress(
        episodeId: string,
        progress: DownloadProgress
    ): void {
        const callback = this.downloadCallbacks.get(episodeId);
        if (callback) {
            callback(progress);
        }
    }

    /**
     * Get MIME type from URL
     */
    private static getMimeTypeFromUrl(url: string): string {
        const extension = url.split(".").pop()?.toLowerCase();
        switch (extension) {
            case "mp3":
                return "audio/mpeg";
            case "mp4":
            case "m4a":
                return "audio/mp4";
            case "ogg":
                return "audio/ogg";
            case "wav":
                return "audio/wav";
            default:
                return "audio/mpeg"; // Default to MP3
        }
    }

    /**
     * Get current download status for an episode
     */
    static async getDownloadStatus(
        episodeId: string
    ): Promise<DownloadProgress | null> {
        const progress = await DatabaseService.getDownloadProgress(episodeId);
        return progress || null;
    }

    /**
     * Retry a failed download
     */
    static async retryDownload(episode: Episode): Promise<void> {
        // Remove failed progress
        await DatabaseService.deleteDownloadProgress(episode.id);

        // Add back to queue
        await this.queueDownload(episode);
    }

    /**
     * Set progress callback for an episode
     */
    static setProgressCallback(
        episodeId: string,
        callback: (progress: DownloadProgress) => void
    ): void {
        this.downloadCallbacks.set(episodeId, callback);
    }

    /**
     * Remove progress callback for an episode
     */
    static removeProgressCallback(episodeId: string): void {
        this.downloadCallbacks.delete(episodeId);
    }

    /**
     * Get storage statistics
     */
    static async getStorageStats() {
        return await DatabaseService.getStorageStats();
    }

    /**
     * Clear all downloads
     */
    static async clearAllDownloads(): Promise<void> {
        // Cancel all active downloads
        for (const [, controller] of this.activeDownloads) {
            controller.abort();
        }
        this.activeDownloads.clear();
        this.downloadCallbacks.clear();

        // Clear database
        await DatabaseService.clearAllDownloads();
    }
}
