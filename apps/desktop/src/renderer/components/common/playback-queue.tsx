"use client";

import { ListX, X } from "lucide-react";

import { DesktopSafeScrollArea } from "@/components/common/desktop-safe-scroll-area";
import {
  List,
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemLeading,
  ListItemTitle,
} from "@/components/ui-custom/list";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import { usePodcastStore } from "@/lib/store";

export function PlaybackQueue() {
  const playbackQueue = usePodcastStore((state) => state.playbackQueue);
  const clearQueue = usePodcastStore((state) => state.clearQueue);
  const playQueuedEpisode = usePodcastStore((state) => state.playQueuedEpisode);
  const removeFromQueue = usePodcastStore((state) => state.removeFromQueue);
  const currentEpisodeId = usePodcastStore((state) => state.playbackState.currentEpisode?.id);
  const hasQueuedEpisodes = playbackQueue.some((episode) => episode.id !== currentEpisodeId);

  return (
    <section className="app-no-drag flex h-full min-w-0 flex-col bg-background">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b px-5">
        <h2 className="font-semibold tracking-[-0.01em]">Play Queue</h2>
        {hasQueuedEpisodes ? (
          <Button
            aria-label="Clear play queue"
            className="size-8 text-muted-foreground"
            onClick={clearQueue}
            size="icon"
            title="Clear play queue"
            variant="ghost"
          >
            <ListX />
          </Button>
        ) : null}
      </header>

      {playbackQueue.length > 0 ? (
        <DesktopSafeScrollArea className="flex-1" contentClassName="px-3 py-2">
          <List>
            {playbackQueue.map((episode) => {
              const isCurrentEpisode = episode.id === currentEpisodeId;

              return (
                <ListItem
                  aria-current={isCurrentEpisode ? "true" : undefined}
                  aria-label={`Play ${episode.title}`}
                  className="rounded-md px-2 py-2.5 after:left-[3.75rem] after:right-2 hover:bg-muted/55 hover:after:hidden"
                  interactive
                  key={episode.id}
                  onClick={() => playQueuedEpisode(episode.id)}
                >
                  <ListItemLeading>
                    <CoverImage
                      alt={episode.title}
                      className="size-10 rounded-md"
                      loading="lazy"
                      src={episode.imageUrl}
                    />
                  </ListItemLeading>
                  <ListItemContent>
                    <ListItemTitle className="line-clamp-2 text-sm leading-5">
                      {episode.title}
                    </ListItemTitle>
                  </ListItemContent>
                  {isCurrentEpisode ? null : (
                    <ListItemActions>
                      <Button
                        aria-label={`Remove ${episode.title} from play queue`}
                        className="size-7 text-muted-foreground"
                        onClick={() => removeFromQueue(episode.id)}
                        size="icon"
                        title="Remove from play queue"
                        variant="ghost"
                      >
                        <X data-icon="inline-start" />
                      </Button>
                    </ListItemActions>
                  )}
                </ListItem>
              );
            })}
          </List>
        </DesktopSafeScrollArea>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="max-w-56">
            <p className="text-sm font-medium">Your queue is empty</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Play an episode or choose Play Next to add it here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
