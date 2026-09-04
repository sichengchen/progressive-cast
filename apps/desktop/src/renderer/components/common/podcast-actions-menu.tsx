"use client";

import { Ellipsis, RefreshCw, Trash2 } from "lucide-react";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Podcast } from "@/lib/types";

interface PodcastActionsMenuProps {
  isRefreshing: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onRequestRemove: () => void;
  open: boolean;
  podcastTitle: string;
}

export function PodcastActionsMenu({
  isRefreshing,
  onOpenChange,
  onRefresh,
  onRequestRemove,
  open,
  podcastTitle,
}: PodcastActionsMenuProps) {
  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`More actions for ${podcastTitle}`}
          className="mr-1 size-7 shrink-0 text-muted-foreground opacity-70 group-hover/menu-item:opacity-100 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground data-[state=open]:opacity-100"
          size="icon"
          title={`More actions for ${podcastTitle}`}
          variant="ghost"
        >
          <Ellipsis data-icon="inline-start" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" side="right" sideOffset={6}>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={isRefreshing} onSelect={onRefresh}>
            <RefreshCw className={isRefreshing ? "animate-spin" : undefined} />
            Update show
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRequestRemove} variant="destructive">
            <Trash2 />
            Remove from library
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RemovePodcastDialogProps {
  isRemoving: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  podcast: Podcast | null;
}

export function RemovePodcastDialog({
  isRemoving,
  onConfirm,
  onOpenChange,
  podcast,
}: RemovePodcastDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={podcast !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this show from your library?</AlertDialogTitle>
          <AlertDialogDescription>
            Rajio will remove &ldquo;{podcast?.title}&rdquo; and its episodes from your library.
            Downloaded files for this show will also be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={isRemoving}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            {isRemoving ? "Removing..." : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
