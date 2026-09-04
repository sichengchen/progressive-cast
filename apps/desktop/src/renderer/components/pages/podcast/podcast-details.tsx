"use client";

import { type ReactNode, useMemo } from "react";
import { Info } from "lucide-react";
import { ContentDetailsHeader } from "@/components/common/content-details-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import ISO6391 from "iso-639-1";
import type { Episode, Podcast } from "@/lib/types";
import { richTextToPlainText } from "@/lib/utils";

interface PodcastDetailsProps {
  actions?: ReactNode;
  episodes: Episode[];
  isLoadingEpisodes?: boolean;
  podcast: Podcast;
}

export function PodcastDetails({
  actions,
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
    <ContentDetailsHeader
      actions={actions}
      artworkAlt={podcast.title}
      artworkSrc={podcast.imageUrl}
      metadataAction={
        cleanDescription ? (
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
                <DialogDescription className="whitespace-pre-wrap leading-relaxed">
                  {cleanDescription || "No description available."}
                </DialogDescription>
              </div>
            </DialogContent>
          </Dialog>
        ) : null
      }
      metadataItems={[
        podcast.author,
        language,
        episodes.length ? `${episodes.length} episodes` : null,
        updated,
      ]}
      title={podcast.title}
    >
      {cleanDescription ? (
        <Dialog>
          <DialogTrigger
            aria-label="Show full description"
            className="hidden max-w-3xl text-left text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground md:line-clamp-2"
          >
            {cleanDescription}
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{podcast.title}</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <DialogDescription className="whitespace-pre-wrap leading-6">
                {cleanDescription}
              </DialogDescription>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </ContentDetailsHeader>
  );
}
