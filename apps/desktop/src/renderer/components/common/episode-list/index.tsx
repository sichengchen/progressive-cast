"use client";

/**
 * EpisodeList Component
 *
 * IMPORTANT: When modifying this component's structure, also update the corresponding
 * EpisodeSkeleton component at /components/common/episode-list/episode-skeleton.tsx
 * to maintain visual consistency during loading states.
 */

import { useEffect, useRef, type MouseEvent } from "react";
import { Play, Clock } from "lucide-react";
import {
  List,
  ListItem,
  ListItemActions,
  ListItemLeading,
  ListItemContent,
  ListItemTitle,
  ListItemDescription,
  ListItemMeta,
} from "@/components/ui-custom/list";
import { CoverImage } from "@/components/ui/cover-image";
import { formatTime, richTextToPlainText } from "@/lib/utils";
import { format } from "date-fns";
import type { Episode, PlaybackProgress } from "@/lib/types";

import { EpisodeSkeleton } from "./episode-skeleton";
import { DownloadButton } from "./download-button";

interface EpisodeListProps {
  isLoadingEpisodes: boolean;
  episodes: Episode[];
  playbackProgress: Map<string, PlaybackProgress>;
  playEpisode: (episode: Episode) => void;
  noEpisodesMessage?: string;
  noEpisodesMessageDescription?: string;
  showDownloadButton?: boolean;
  showDeleteButton?: boolean;
  pageType?: "podcast" | "downloaded" | "other";
  onDownloadComplete?: () => void;
  onDeleteComplete?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
}

export function EpisodeList({
  isLoadingEpisodes,
  episodes,
  playbackProgress,
  playEpisode,
  noEpisodesMessage,
  noEpisodesMessageDescription,
  showDownloadButton = false,
  showDeleteButton = false,
  pageType = "other",
  onDownloadComplete,
  onDeleteComplete,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: EpisodeListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  const handlePlayEpisode = (episode: Episode, event?: MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    playEpisode(episode);
  };

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
          const cleanedDescription = richTextToPlainText(episode.description);

          return (
            <ListItem
              key={episode.id}
              interactive
              className="group relative px-2"
              onClick={() => handlePlayEpisode(episode)}
            >
              <ListItemLeading>
                <CoverImage
                  src={episode.imageUrl}
                  alt={episode.title}
                  className="w-20 h-20 relative"
                  loading="lazy"
                >
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </div>
                </CoverImage>
              </ListItemLeading>

              <ListItemContent className="space-y-1">
                <ListItemMeta>
                  <div className="flex items-center gap-2">
                    <span>{format(new Date(episode.publishedAt), "MMM d, yyyy")}</span>
                    {episode.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(episode.duration)}
                      </span>
                    )}
                  </div>
                </ListItemMeta>

                <ListItemTitle className="line-clamp-2">{episode.title}</ListItemTitle>

                <ListItemDescription className="line-clamp-2">
                  {cleanedDescription}
                </ListItemDescription>

                {progress && progress.currentTime > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-secondary rounded-full h-1">
                      <div
                        className="bg-primary h-1 rounded-full"
                        style={{
                          width: `${(progress.currentTime / progress.duration) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
                    </span>
                  </div>
                )}
              </ListItemContent>

              {showDownloadButton || showDeleteButton ? (
                <ListItemActions>
                  <DownloadButton
                    episode={episode}
                    pageType={pageType}
                    onDownloadComplete={onDownloadComplete}
                    onDeleteComplete={onDeleteComplete}
                  />
                </ListItemActions>
              ) : null}
            </ListItem>
          );
        })}
      </List>
      <div ref={loadMoreRef} className="h-px" />
      {isLoadingMore ? <EpisodeSkeleton count={3} /> : null}
    </>
  );
}
