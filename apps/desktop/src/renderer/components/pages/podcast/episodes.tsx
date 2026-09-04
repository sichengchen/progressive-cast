"use client";

import { useCallback, useEffect } from "react";
import { usePodcastStore } from "@/lib/store";
import type { Episode } from "@/lib/types";
import { EpisodeList } from "../../common/episode-list";

interface PodcastEpisodesProps {
  podcastId: string;
}

const emptyEpisodes: Episode[] = [];

export function PodcastEpisodes({ podcastId }: PodcastEpisodesProps) {
  const episodes = usePodcastStore((state) => state.episodeCache.get(podcastId) ?? emptyEpisodes);
  const pageState = usePodcastStore((state) => state.episodePageState.get(podcastId));
  const playbackProgress = usePodcastStore((state) => state.playbackProgress);
  const currentEpisodeId = usePodcastStore((state) => state.playbackState.currentEpisode?.id);
  const loadEpisodes = usePodcastStore((state) => state.loadEpisodes);
  const loadMoreEpisodes = usePodcastStore((state) => state.loadMoreEpisodes);
  const playEpisode = usePodcastStore((state) => state.playEpisode);

  const handleDownloadComplete = async () => {
    try {
      await loadEpisodes(podcastId);
    } catch (error) {
      console.error("Failed to refresh episodes after download:", error);
    }
  };

  useEffect(() => {
    const loadPodcastEpisodes = async () => {
      if (pageState?.loaded) {
        return;
      }

      await loadEpisodes(podcastId);
    };

    loadPodcastEpisodes();
  }, [pageState?.loaded, podcastId, loadEpisodes]);

  const handleLoadMore = useCallback(async () => {
    await loadMoreEpisodes(podcastId);
  }, [loadMoreEpisodes, podcastId]);

  return (
    <section aria-labelledby="episode-list-heading" className="pt-5">
      <h2
        className="px-2 pb-1.5 text-lg font-semibold tracking-[-0.015em]"
        id="episode-list-heading"
      >
        Episodes
      </h2>
      <EpisodeList
        currentEpisodeId={currentEpisodeId}
        isLoadingEpisodes={Boolean(!pageState?.loaded)}
        episodes={episodes}
        playbackProgress={playbackProgress}
        playEpisode={playEpisode}
        onDownloadComplete={handleDownloadComplete}
        hasMore={Boolean(pageState?.hasMore)}
        isLoadingMore={Boolean(pageState?.isLoading && pageState.loaded)}
        onLoadMore={handleLoadMore}
      />
    </section>
  );
}
