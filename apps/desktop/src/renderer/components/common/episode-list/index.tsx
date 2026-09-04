"use client";

/**
 * EpisodeList Component
 *
 * IMPORTANT: When modifying this component's structure, also update the corresponding
 * EpisodeSkeleton component at /components/common/episode-list/episode-skeleton.tsx
 * to maintain visual consistency during loading states.
 */

import { useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import {
  List,
  ListItem,
  ListItemActions,
  ListItemLeading,
  ListItemContent,
  ListItemDescription,
  ListItemTitle,
} from "@/components/ui-custom/list";
import { CoverImage } from "@/components/ui/cover-image";
import { ContentMetadata } from "@/components/common/content-metadata";
import { formatEpisodeDate, richTextToPlainText } from "@/lib/utils";
import type { Episode, PlaybackProgress } from "@/lib/types";

import { EpisodeSkeleton } from "./episode-skeleton";
import { EpisodeActionsMenu } from "./episode-actions-menu";
import { EpisodePlaybackButton } from "./episode-playback-button";

interface EpisodeListProps {
  isLoadingEpisodes: boolean;
  episodes: Episode[];
  playbackProgress: Map<string, PlaybackProgress>;
  playEpisode: (episode: Episode) => void;
  noEpisodesMessage?: string;
  noEpisodesMessageDescription?: string;
  onDownloadComplete?: () => void | Promise<void>;
  onDeleteComplete?: () => void | Promise<void>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
  currentEpisodeId?: string;
}

export function EpisodeList({
  isLoadingEpisodes,
  episodes,
  playbackProgress,
  playEpisode,
  noEpisodesMessage,
  noEpisodesMessageDescription,
  onDownloadComplete,
  onDeleteComplete,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  currentEpisodeId,
}: EpisodeListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [actionsEpisodeId, setActionsEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !onLoadMore || !hasMore || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void onLoadMore();
        }
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Show skeleton while loading episodes
  if (isLoadingEpisodes) {
    return <EpisodeSkeleton />;
  }

  if (episodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] py-12">
        <div className="text-center text-muted-foreground">
          <p>{noEpisodesMessage ?? "No episodes found"}</p>
          <p className="text-sm">{noEpisodesMessageDescription ?? "Try refreshing the podcast"}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <List className="px-0">
        {episodes.map((episode) => {
          const progress = playbackProgress.get(episode.id);
          const description = richTextToPlainText(episode.description);

          return (
            <ListItem
              key={episode.id}
              className="group rounded-lg px-2 py-2.5 transition-colors after:left-[4.25rem] after:right-2 hover:bg-muted/55 hover:after:hidden"
              onContextMenu={(event) => {
                event.preventDefault();
                setActionsEpisodeId(episode.id);
              }}
            >
              <ListItemLeading>
                <CoverImage
                  src={episode.imageUrl}
                  alt={episode.title}
                  className="size-12 rounded-md"
                  loading="lazy"
                />
              </ListItemLeading>

              <ListItemContent className="flex flex-col gap-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <ContentMetadata items={[formatEpisodeDate(episode.publishedAt)]} />
                  {progress?.isCompleted ? (
                    <CircleCheck
                      aria-label="Listened"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  ) : null}
                </div>

                <ListItemTitle className="line-clamp-2 text-[15px] leading-5 tracking-[-0.01em]">
                  {episode.title}
                </ListItemTitle>

                {description ? (
                  <ListItemDescription className="line-clamp-2 mt-0 leading-5">
                    {description}
                  </ListItemDescription>
                ) : null}
              </ListItemContent>

              <ListItemActions className="gap-2">
                <EpisodePlaybackButton episode={episode} onPlay={playEpisode} progress={progress} />
                <EpisodeActionsMenu
                  currentEpisodeId={currentEpisodeId}
                  episode={episode}
                  onDeleteComplete={onDeleteComplete}
                  onDownloadComplete={onDownloadComplete}
                  onOpenChange={(open) => setActionsEpisodeId(open ? episode.id : null)}
                  open={actionsEpisodeId === episode.id}
                />
              </ListItemActions>
            </ListItem>
          );
        })}
      </List>
      <div ref={loadMoreRef} className="h-px" />
      {isLoadingMore ? <EpisodeSkeleton count={3} /> : null}
    </>
  );
}
