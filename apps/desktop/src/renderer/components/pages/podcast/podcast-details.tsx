"use client";

import { useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import { ContentMetadata } from "@/components/common/content-metadata";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePodcastStore } from "@/lib/store";
import { toast } from "sonner";
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
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const navigate = useNavigate();
  const cleanDescription = richTextToPlainText(podcast.description);

  const unsubscribeFromPodcast = usePodcastStore((state) => state.unsubscribeFromPodcast);

  // Get the latest episode for this podcast
  const latestEpisode = useMemo(
    () =>
      [...episodes].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )[0],
    [episodes],
  );

  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);
    try {
      await unsubscribeFromPodcast(podcast.id);
      navigate({ to: "/library" });
      toast.success(`Unsubscribed from ${podcast.title}`);
    } catch (error) {
      toast.error("Failed to unsubscribe");
      console.error("Unsubscribe error:", error);
    } finally {
      setIsUnsubscribing(false);
    }
  };

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

            <div className="flex items-center gap-1.5">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    aria-label="Remove from library"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={isUnsubscribing}
                    size="icon"
                    title="Remove from library"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this show from your library?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Rajio will remove &ldquo;{podcast.title}&rdquo; and its episodes from your
                      library. Downloaded files for this show will also be removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUnsubscribe}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isUnsubscribing ? "Removing..." : "Remove"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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
