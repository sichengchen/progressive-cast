"use client";

import { Play, X } from "lucide-react";

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

  return (
    <section className="app-no-drag flex h-full min-w-0 flex-col bg-background">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b px-5">
        <h2 className="font-semibold tracking-[-0.01em]">Up Next</h2>
        {playbackQueue.length > 0 ? (
          <Button className="h-7 px-2" onClick={clearQueue} size="sm" variant="ghost">
            Clear
          </Button>
        ) : null}
      </header>

      {playbackQueue.length > 0 ? (
        <DesktopSafeScrollArea className="flex-1" contentClassName="px-3 py-2">
          <List>
            {playbackQueue.map((episode) => (
              <ListItem
                className="rounded-md px-2 py-2.5 after:left-[3.75rem] after:right-2 hover:bg-muted/55 hover:after:hidden"
                key={episode.id}
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
                <ListItemActions>
                  <Button
                    aria-label={`Play ${episode.title} now`}
                    className="size-7"
                    onClick={() => playQueuedEpisode(episode.id)}
                    size="icon"
                    title="Play now"
                    variant="ghost"
                  >
                    <Play data-icon="inline-start" fill="currentColor" />
                  </Button>
                  <Button
                    aria-label={`Remove ${episode.title} from Up Next`}
                    className="size-7 text-muted-foreground"
                    onClick={() => removeFromQueue(episode.id)}
                    size="icon"
                    title="Remove from Up Next"
                    variant="ghost"
                  >
                    <X data-icon="inline-start" />
                  </Button>
                </ListItemActions>
              </ListItem>
            ))}
          </List>
        </DesktopSafeScrollArea>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="max-w-56">
            <p className="text-sm font-medium">Your queue is empty</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Use an episode menu and choose Play Next.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
