"use client";

import { useState, useEffect, useMemo } from "react";
import { usePodcastStore } from "@/lib/store";
import type { Episode } from "@/lib/types";
import { EpisodeList } from "@/components/common/episode-list";

export function ResumePlayingPage() {
    const [unfinishedEpisodes, setUnfinishedEpisodes] = useState<Episode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { podcasts, playEpisode, playbackProgress } = usePodcastStore();

    useEffect(() => {
        const loadUnfinishedEpisodes = async () => {
            const startTime = performance.now();
            setIsLoading(true);

            try {
                // Get unfinished episodes from store
                const episodes = await usePodcastStore
                    .getState()
                    .getUnfinishedEpisodes();
                setUnfinishedEpisodes(episodes);

                // Performance monitoring in development
                if (process.env.NODE_ENV === "development") {
                    const loadTime = performance.now() - startTime;
                    console.log(
                        `Resume Playing loaded in ${loadTime.toFixed(
                            2
                        )}ms with ${episodes.length} episodes`
                    );
                }
            } catch (error) {
                console.error("Failed to load unfinished episodes:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Early return if no podcasts
        if (podcasts.length === 0) {
            setIsLoading(false);
            return;
        }

        // Start loading immediately
        loadUnfinishedEpisodes();
    }, [podcasts.length, playbackProgress]);

    // Memoize episode processing to avoid recalculation on re-renders
    const processedEpisodes = useMemo(() => {
        return unfinishedEpisodes.map((episode) => ({
            ...episode,
            podcast: podcasts.find((p) => p.id === episode.podcastId),
            progress: playbackProgress.get(episode.id),
        }));
    }, [unfinishedEpisodes, podcasts, playbackProgress]);

    return (
        <EpisodeList
            isLoadingEpisodes={isLoading}
            episodes={processedEpisodes}
            playbackProgress={playbackProgress}
            playEpisode={playEpisode}
            noEpisodesMessage="No episodes to resume"
            noEpisodesMessageDescription="Start playing some episodes to see them here"
        />
    );
}
