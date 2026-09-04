"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePodcastStore } from "@/lib/store";
import type { Episode } from "@/lib/types";
import { EpisodeList } from "@/components/common/episode-list";
import { formatLastPlayedDate } from "@/lib/utils";

export function ResumePlayingPage() {
  const [unfinishedEpisodes, setUnfinishedEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const { podcasts, playEpisode, playbackProgress } = usePodcastStore();
  const currentEpisodeId = usePodcastStore((state) => state.playbackState.currentEpisode?.id);

  useEffect(() => {
    const loadUnfinishedEpisodes = async () => {
      const startTime = performance.now();
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }

      try {
        // Get unfinished episodes from store
        const episodes = await usePodcastStore.getState().getUnfinishedEpisodes();
        setUnfinishedEpisodes(episodes);

        // Performance monitoring in development
        if (import.meta.env.DEV) {
          const loadTime = performance.now() - startTime;
          console.log(
            `Resume Playing loaded in ${loadTime.toFixed(2)}ms with ${episodes.length} episodes`,
          );
        }
      } catch (error) {
        console.error("Failed to load unfinished episodes:", error);
      } finally {
        hasLoadedRef.current = true;
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

  const podcastsById = useMemo(
    () => new Map(podcasts.map((podcast) => [podcast.id, podcast] as const)),
    [podcasts],
  );
  const sortedEpisodes = useMemo(
    () =>
      [...unfinishedEpisodes].sort((first, second) => {
        const firstPlayedAt = playbackProgress.get(first.id)?.lastPlayedAt.getTime() ?? 0;
        const secondPlayedAt = playbackProgress.get(second.id)?.lastPlayedAt.getTime() ?? 0;
        return secondPlayedAt - firstPlayedAt;
      }),
    [unfinishedEpisodes, playbackProgress],
  );
  const getMetadataItems = useCallback(
    (episode: Episode) => {
      const lastPlayedAt = playbackProgress.get(episode.id)?.lastPlayedAt;
      return [
        podcastsById.get(episode.podcastId)?.title,
        lastPlayedAt ? formatLastPlayedDate(lastPlayedAt) : null,
      ];
    },
    [playbackProgress, podcastsById],
  );

  if (isLoading || sortedEpisodes.length === 0) {
    return (
      <EpisodeList
        currentEpisodeId={currentEpisodeId}
        isLoadingEpisodes={isLoading}
        episodes={sortedEpisodes}
        playbackProgress={playbackProgress}
        playEpisode={playEpisode}
        noEpisodesMessage="No episodes to resume"
        noEpisodesMessageDescription="Start playing some episodes to see them here"
        skeletonCount={3}
      />
    );
  }

  const [continueEpisode, ...earlierEpisodes] = sortedEpisodes;

  return (
    <div className="flex flex-col gap-5 pb-4">
      <section aria-labelledby="continue-heading">
        <h2 className="px-2 pb-1 text-sm font-semibold" id="continue-heading">
          Continue
        </h2>
        <EpisodeList
          currentEpisodeId={currentEpisodeId}
          episodes={[continueEpisode]}
          getMetadataItems={getMetadataItems}
          isLoadingEpisodes={false}
          playbackProgress={playbackProgress}
          playEpisode={playEpisode}
          variant="featured"
        />
      </section>

      {earlierEpisodes.length > 0 ? (
        <section aria-labelledby="earlier-heading">
          <h2
            className="px-2 pb-1 text-sm font-semibold text-muted-foreground"
            id="earlier-heading"
          >
            Earlier
          </h2>
          <EpisodeList
            currentEpisodeId={currentEpisodeId}
            episodes={earlierEpisodes}
            getMetadataItems={getMetadataItems}
            isLoadingEpisodes={false}
            playbackProgress={playbackProgress}
            playEpisode={playEpisode}
            variant="compact"
          />
        </section>
      ) : null}
    </div>
  );
}
