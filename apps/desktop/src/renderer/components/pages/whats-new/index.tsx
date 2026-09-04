"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePodcastStore } from "@/lib/store";
import { EpisodeList } from "@/components/common/episode-list";

export function WhatsNewPage() {
  const [isLoading, setIsLoading] = useState(true);

  const {
    latestEpisodes,
    latestEpisodesPage,
    loadMoreLatestEpisodes,
    podcasts,
    playEpisode,
    playbackProgress,
    isImporting,
  } = usePodcastStore();
  const currentEpisodeId = usePodcastStore((state) => state.playbackState.currentEpisode?.id);

  useEffect(() => {
    const loadLatestEpisodes = async () => {
      const startTime = performance.now();
      setIsLoading(true);

      try {
        // Use optimized store method that includes caching
        await usePodcastStore.getState().getLatestEpisodes();

        // Performance monitoring in development
        if (import.meta.env.DEV) {
          const loadTime = performance.now() - startTime;
          console.log(
            `What's New loaded in ${loadTime.toFixed(2)}ms`,
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

    if (latestEpisodesPage.loaded) {
      setIsLoading(false);
      return;
    }

    // Start loading immediately
    loadLatestEpisodes();
  }, [podcasts.length, isImporting, latestEpisodesPage.loaded]);

  const handleLoadMore = useCallback(async () => {
    await loadMoreLatestEpisodes();
  }, [loadMoreLatestEpisodes]);

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
        currentEpisodeId={currentEpisodeId}
        isLoadingEpisodes={isLoading}
        episodes={processedEpisodes}
        playbackProgress={playbackProgress}
        playEpisode={playEpisode}
        noEpisodesMessage="No episodes found"
        noEpisodesMessageDescription="Subscribe to some podcasts to see the latest episodes here"
        hasMore={latestEpisodesPage.hasMore}
        isLoadingMore={latestEpisodesPage.isLoading && latestEpisodesPage.loaded}
        onLoadMore={handleLoadMore}
      />
    </>
  );
}
