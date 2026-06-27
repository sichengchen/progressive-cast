"use client";

import { useEffect, useState } from "react";
import { usePodcastStore } from "@/lib/store";
import type { Episode } from "@/lib/types";
import { EpisodeList } from "../../common/episode-list";

interface PodcastEpisodesProps {
  podcastId: string;
}

const emptyEpisodes: Episode[] = [];

export function PodcastEpisodes({ podcastId }: PodcastEpisodesProps) {
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  const episodes = usePodcastStore((state) => state.episodeCache.get(podcastId) ?? emptyEpisodes);
  const playbackProgress = usePodcastStore((state) => state.playbackProgress);
  const loadEpisodes = usePodcastStore((state) => state.loadEpisodes);
  const playEpisode = usePodcastStore((state) => state.playEpisode);
  const hasCachedEpisodes = usePodcastStore((state) => state.episodeCache.has(podcastId));

  const handleDownloadComplete = async () => {
    try {
      await loadEpisodes(podcastId);
    } catch (error) {
      console.error("Failed to refresh episodes after download:", error);
    }
  };

  useEffect(() => {
    const loadPodcastEpisodes = async () => {
      if (hasCachedEpisodes) {
        setIsLoadingEpisodes(false);
        return;
      }

      setIsLoadingEpisodes(!hasCachedEpisodes);
      try {
        await loadEpisodes(podcastId);
      } finally {
        setIsLoadingEpisodes(false);
      }
    };

    loadPodcastEpisodes();
  }, [hasCachedEpisodes, podcastId, loadEpisodes]);

  return (
    <div>
      <h2 className="text-xl font-semibold px-2">Episodes</h2>
      <EpisodeList
        isLoadingEpisodes={isLoadingEpisodes}
        episodes={episodes}
        playbackProgress={playbackProgress}
        playEpisode={playEpisode}
        showDownloadButton={true}
        pageType="podcast"
        onDownloadComplete={handleDownloadComplete}
      />
    </div>
  );
}
