"use client";

import { useState, useEffect, useMemo } from "react";
import { usePodcastStore } from "@/lib/store";
import type { Episode } from "@/lib/types";
import { EpisodeList } from "@/components/common/episode-list";

export function WhatsNewPage() {
    const [latestEpisodes, setLatestEpisodes] = useState<Episode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { podcasts, playEpisode, preferences, playbackProgress, isImporting } =
        usePodcastStore();

    useEffect(() => {
        const loadLatestEpisodes = async () => {
            const startTime = performance.now();
            setIsLoading(true);

            try {
                // Use optimized store method that includes caching
                const episodes = await usePodcastStore
                    .getState()
                    .getLatestEpisodes();
                setLatestEpisodes(episodes);

                // Performance monitoring in development
                if (process.env.NODE_ENV === "development") {
                    const loadTime = performance.now() - startTime;
                    console.log(
                        `What's New loaded in ${loadTime.toFixed(2)}ms with ${
                            episodes.length
                        } episodes`
                    );
                }
            } catch (error) {
                console.error("Failed to load latest episodes:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Early return if no podcasts
        if (podcasts.length === 0) {
            setIsLoading(false);
            return;
        }

        // Don't reload during OPML import to prevent flicker
        if (isImporting) {
            return;
        }

        // Start loading immediately
        loadLatestEpisodes();
    }, [preferences.whatsNewCount, podcasts.length, isImporting]);

    // Memoize episode processing to avoid recalculation on re-renders
    const processedEpisodes = useMemo(() => {
        return latestEpisodes.map((episode) => ({
            ...episode,
            podcast: podcasts.find((p) => p.id === episode.podcastId),
            progress: playbackProgress.get(episode.id),
        }));
    }, [latestEpisodes, podcasts, playbackProgress]);

    return (
        <>
            <EpisodeList
                isLoadingEpisodes={isLoading}
                episodes={processedEpisodes}
                playbackProgress={playbackProgress}
                playEpisode={playEpisode}
                noEpisodesMessage="No episodes found"
                noEpisodesMessageDescription="Subscribe to some podcasts to see the latest episodes here"
            />
        </>
    );
}
