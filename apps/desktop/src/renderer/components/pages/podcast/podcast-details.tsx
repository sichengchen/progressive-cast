"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import { ContentMetadata } from "@/components/common/content-metadata";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import ISO6391 from "iso-639-1";
import type { Episode, Podcast } from "@/lib/types";
import { richTextToPlainText } from "@/lib/utils";

interface PodcastDetailsProps {
  episodes: Episode[];
  isLoadingEpisodes?: boolean;
  podcast: Podcast;
}

export function PodcastDetails({
  episodes,
  isLoadingEpisodes = false,
  podcast,
}: PodcastDetailsProps) {
  const cleanDescription = richTextToPlainText(podcast.description);

  // Get the latest episode for this podcast
  const latestEpisode = useMemo(
    () =>
      [...episodes].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )[0],
    [episodes],
  );

  const language = podcast.language
    ? ISO6391.getName(podcast.language.split("-")[0]) || podcast.language
    : null;
  const updated = latestEpisode
    ? `Updated ${formatDistanceToNow(new Date(latestEpisode.publishedAt), { addSuffix: true })}`
    : isLoadingEpisodes
      ? null
      : "No episodes";

  return (
    <header className="border-b border-border/60 px-2 py-5">
      <div className="flex min-w-0 items-center gap-5 md:gap-6">
        <div className="shrink-0">
          <CoverImage
            src={podcast.imageUrl}
            alt={podcast.title}
            className="size-28 rounded-lg shadow-sm ring-1 ring-foreground/10 md:size-36"
            fetchPriority="high"
          />
        </div>

        <div className="min-w-0 flex-1 text-left">
          {podcast.author ? (
            <p className="mb-1.5 truncate text-sm font-medium text-muted-foreground">
              {podcast.author}
            </p>
          ) : null}
          <h1 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-[-0.025em] md:text-[2rem]">
            {podcast.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ContentMetadata
              items={[language, episodes.length ? `${episodes.length} episodes` : null, updated]}
            />

            {cleanDescription ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="size-8 md:hidden" size="icon" variant="ghost">
                    <Info className="size-4" />
                    <span className="sr-only">About this show</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{podcast.title}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {cleanDescription || "No description available."}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>

          {cleanDescription ? (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  aria-label="Show full description"
                  className="mt-3 hidden max-w-3xl text-left text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground md:line-clamp-2"
                  type="button"
                >
                  {cleanDescription}
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{podcast.title}</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {cleanDescription}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>
    </header>
  );
}
