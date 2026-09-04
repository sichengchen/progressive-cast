"use client";

import { useEffect, useState } from "react";
import { Download, Ellipsis, Heart, ListPlus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePodcastStore } from "@/lib/store";
import type { Episode } from "@/lib/types";

interface EpisodeActionsMenuProps {
  currentEpisodeId?: string;
  episode: Episode;
  onDeleteComplete?: () => void | Promise<void>;
  onDownloadComplete?: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function EpisodeActionsMenu({
  currentEpisodeId,
  episode,
  onDeleteComplete,
  onDownloadComplete,
  onOpenChange,
  open,
}: EpisodeActionsMenuProps) {
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(Boolean(episode.isDownloaded));
  const [isDownloading, setIsDownloading] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const addToQueue = usePodcastStore((state) => state.addToQueue);
  const deleteDownload = usePodcastStore((state) => state.deleteDownload);
  const downloadEpisode = usePodcastStore((state) => state.downloadEpisode);
  const isFavorite = usePodcastStore((state) =>
    state.favoriteEpisodes.some((favoriteEpisode) => favoriteEpisode.id === episode.id),
  );
  const toggleFavoriteEpisode = usePodcastStore((state) => state.toggleFavoriteEpisode);

  useEffect(() => {
    setIsDownloaded(Boolean(episode.isDownloaded));
  }, [episode.isDownloaded]);

  const handlePlayNext = () => {
    addToQueue(episode);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadFailed(false);
    try {
      await downloadEpisode(episode);
      setIsDownloaded(true);
      await onDownloadComplete?.();
      toast.success("Episode downloaded");
    } catch (error) {
      setDownloadFailed(true);
      toast.error(error instanceof Error ? error.message : "Failed to download episode");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemoveDownload = async () => {
    try {
      await deleteDownload(episode.id);
      setIsDownloaded(false);
      setRemoveDialogOpen(false);
      await onDeleteComplete?.();
      toast.success("Download removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove download");
    }
  };

  return (
    <>
      <DropdownMenu onOpenChange={onOpenChange} open={open}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`More actions for ${episode.title}`}
            className="size-7 text-muted-foreground opacity-70 group-hover:opacity-100 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:opacity-100"
            size="icon"
            title={`More actions for ${episode.title}`}
            type="button"
            variant="ghost"
          >
            <Ellipsis data-icon="inline-start" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={currentEpisodeId === episode.id} onSelect={handlePlayNext}>
              <ListPlus />
              Play Next
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggleFavoriteEpisode(episode)}>
              <Heart className={isFavorite ? "fill-current" : undefined} />
              {isFavorite ? "Remove from Favorites" : "Save to Favorites"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {isDownloaded ? (
              <DropdownMenuItem onSelect={() => setRemoveDialogOpen(true)}>
                <Trash2 />
                Remove Download
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={isDownloading} onSelect={() => void handleDownload()}>
                {downloadFailed ? <RotateCcw /> : <Download />}
                {isDownloading ? "Downloading…" : downloadFailed ? "Retry Download" : "Download"}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setRemoveDialogOpen} open={removeDialogOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this download?</AlertDialogTitle>
            <AlertDialogDescription>
              The episode will remain in your library and can be downloaded again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleRemoveDownload();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
