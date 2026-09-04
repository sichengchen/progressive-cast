"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { BackNavigation } from "@/components/common/back-navigation";
import { ContentDetailsHeader } from "@/components/common/content-details-header";
import { EpisodeActionsMenu } from "@/components/common/episode-list/episode-actions-menu";
import { EpisodePlaybackButton } from "@/components/common/episode-list/episode-playback-button";
import { ShowNotesReader } from "@/components/common/show-notes-reader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePodcastStore } from "@/lib/store";
import type { Episode } from "@/lib/types";
import { formatEpisodeDate } from "@/lib/utils";

interface EpisodePageProps {
  episodeId: string;
}

export function EpisodePage({ episodeId }: EpisodePageProps) {
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const currentEpisodeId = usePodcastStore((state) => state.playbackState.currentEpisode?.id);
  const getEpisode = usePodcastStore((state) => state.getEpisode);
  const playbackProgress = usePodcastStore((state) => state.playbackProgress);
  const playEpisode = usePodcastStore((state) => state.playEpisode);
  const podcasts = usePodcastStore((state) => state.podcasts);
  const seekToTime = usePodcastStore((state) => state.seekToTime);

  useEffect(() => {
    let active = true;

    const loadEpisode = async () => {
      setIsLoading(true);
      const nextEpisode = await getEpisode(episodeId);
      if (active) {
        setEpisode(nextEpisode);
        setIsLoading(false);
      }
    };

    void loadEpisode();

    return () => {
      active = false;
    };
  }, [episodeId, getEpisode]);

  if (isLoading) {
    return <EpisodePageSkeleton />;
  }

  if (!episode) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center px-6 text-center">
        <div>
          <p className="font-medium">Episode unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been removed from the podcast feed.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/whats-new" })} size="sm">
            Back to What&apos;s New
          </Button>
        </div>
      </div>
    );
  }

  const podcast = podcasts.find((item) => item.id === episode.podcastId);
  const progress = playbackProgress.get(episode.id);
  const showNotes = episode.showNotes || episode.content || episode.description;

  const handleBack = () => {
    if (podcast) {
      navigate({ params: { podcastId: podcast.id }, to: "/podcast/$podcastId" });
      return;
    }

    navigate({ to: "/whats-new" });
  };

  const handleSeek = (seconds: number) => {
    if (currentEpisodeId !== episode.id) {
      playEpisode(episode);
      queueMicrotask(() => usePodcastStore.getState().seekToTime(seconds));
      return;
    }

    seekToTime(seconds);
  };

  return (
    <article className="mx-auto max-w-4xl pb-12 pt-5">
      <div className="mb-1 sm:pl-36 md:pl-44">
        <BackNavigation
          className="-ml-2"
          label={podcast?.title ?? "What's New"}
          onClick={handleBack}
        />
      </div>

      <ContentDetailsHeader
        actions={
          <EpisodeActionsMenu
            currentEpisodeId={currentEpisodeId}
            episode={episode}
            onOpenChange={setActionsOpen}
            open={actionsOpen}
          />
        }
        artworkAlt={episode.title}
        artworkSrc={episode.imageUrl || podcast?.imageUrl}
        metadataItems={[podcast?.title, formatEpisodeDate(episode.publishedAt)]}
        title={episode.title}
      >
        <div className="mt-0.5 flex items-center">
          <EpisodePlaybackButton episode={episode} onPlay={playEpisode} progress={progress} />
        </div>
      </ContentDetailsHeader>

      <div className="max-w-[61rem] pt-6 sm:pl-36 md:pl-44">
        {showNotes ? (
          <ShowNotesReader content={showNotes} onSeek={handleSeek} />
        ) : (
          <p className="py-10 text-sm text-muted-foreground">No notes for this episode.</p>
        )}
      </div>
    </article>
  );
}

function EpisodePageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl pb-12 pt-5">
      <div className="mb-1 sm:pl-36 md:pl-44">
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <div className="flex min-w-0 items-start gap-5 border-b border-border/60 px-2 py-5 md:gap-6">
        <Skeleton className="size-28 shrink-0 rounded-lg md:size-36" />
        <div className="flex min-h-28 min-w-0 flex-1 flex-col gap-2.5 pt-1 md:min-h-36">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-7 w-36 rounded-md" />
        </div>
      </div>
      <div className="max-w-[61rem] space-y-3 pt-6 sm:pl-36 md:pl-44">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
