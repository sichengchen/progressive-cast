"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ContentMetadata } from "@/components/common/content-metadata";
import { EpisodeActionsMenu } from "@/components/common/episode-list/episode-actions-menu";
import { EpisodePlaybackButton } from "@/components/common/episode-list/episode-playback-button";
import { ShowNotesReader } from "@/components/common/show-notes-reader";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
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
  const currentPage = usePodcastStore((state) => state.currentPage);
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
    if (currentPage === "resume-playing") {
      navigate({ to: "/resume-playing" });
      return;
    }

    if (currentPage === "downloaded") {
      navigate({ to: "/downloaded" });
      return;
    }

    if (currentPage === "favorites") {
      navigate({ to: "/favorites" });
      return;
    }

    if (currentPage === "podcasts" && podcast) {
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
    <article className="mx-auto max-w-4xl px-2 pb-12 pt-5">
      <Button className="-ml-2 mb-4" onClick={handleBack} size="sm" variant="ghost">
        <ArrowLeft data-icon="inline-start" />
        {getBackLabel(currentPage)}
      </Button>

      <header className="flex min-w-0 items-start gap-5 border-b border-border/70 pb-6 md:gap-7">
        <CoverImage
          alt={episode.title}
          className="size-28 rounded-lg shadow-sm ring-1 ring-foreground/10 md:size-36"
          fetchPriority="high"
          loading="eager"
          src={episode.imageUrl || podcast?.imageUrl}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
          {podcast ? (
            <Button
              className="-ml-2 h-auto w-fit justify-start px-2 py-1 text-muted-foreground"
              onClick={() =>
                navigate({ params: { podcastId: podcast.id }, to: "/podcast/$podcastId" })
              }
              size="sm"
              variant="ghost"
            >
              {podcast.title}
            </Button>
          ) : null}

          <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.025em] md:text-[2rem]">
            {episode.title}
          </h1>

          <ContentMetadata
            className="text-sm leading-5"
            items={[formatEpisodeDate(episode.publishedAt)]}
          />

          <div className="mt-1 flex items-center gap-1.5">
            <EpisodePlaybackButton episode={episode} onPlay={playEpisode} progress={progress} />
            <EpisodeActionsMenu
              currentEpisodeId={currentEpisodeId}
              episode={episode}
              onOpenChange={setActionsOpen}
              open={actionsOpen}
            />
          </div>
        </div>
      </header>

      <div className="max-w-3xl pt-1">
        {showNotes ? (
          <ShowNotesReader content={showNotes} onSeek={handleSeek} />
        ) : (
          <p className="py-10 text-sm text-muted-foreground">No notes for this episode.</p>
        )}
      </div>
    </article>
  );
}

function getBackLabel(currentPage: ReturnType<typeof usePodcastStore.getState>["currentPage"]) {
  if (currentPage === "resume-playing") return "Resume Playing";
  if (currentPage === "downloaded") return "Downloaded";
  if (currentPage === "favorites") return "Favorites";
  if (currentPage === "podcasts") return "Show";
  return "What's New";
}

function EpisodePageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-2 pb-12 pt-5">
      <Skeleton className="mb-5 h-8 w-28 rounded-md" />
      <div className="flex gap-5 border-b border-border/70 pb-6 md:gap-7">
        <Skeleton className="size-28 shrink-0 rounded-lg md:size-36" />
        <div className="flex flex-1 flex-col gap-3 pt-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-full max-w-2xl" />
          <Skeleton className="h-8 w-2/3 max-w-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-32 rounded-md" />
        </div>
      </div>
      <div className="flex max-w-3xl flex-col gap-3 pt-8">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
