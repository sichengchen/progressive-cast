"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  List,
  ListItem,
  ListItemActions,
  ListItemLeading,
  ListItemContent,
  ListItemMeta,
} from "@/components/ui-custom/list";
import { episodeListVariantStyles, type EpisodeListVariant } from "./episode-list-styles";

interface EpisodeSkeletonProps {
  count?: number;
  variant?: EpisodeListVariant;
}

export function EpisodeSkeleton({ count = 10, variant = "default" }: EpisodeSkeletonProps) {
  const variantStyles = episodeListVariantStyles[variant];

  return (
    <List className="px-0">
      {Array.from({ length: count }, (_, index) => (
        <ListItem key={index} className={cn("px-2 after:right-2", variantStyles.item)}>
          <ListItemLeading>
            <Skeleton className={cn("rounded-md", variantStyles.artwork)} />
          </ListItemLeading>

          <ListItemContent className={cn("flex flex-col gap-1.5", variantStyles.content)}>
            <ListItemMeta>
              <Skeleton className="h-3 w-16" />
            </ListItemMeta>

            <div className="font-medium leading-none tracking-tight">
              <Skeleton className="mb-1 h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {variant === "compact" ? null : <Skeleton className="h-3.5 w-full max-w-xl" />}
          </ListItemContent>

          <ListItemActions>
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="size-7 rounded-md" />
          </ListItemActions>
        </ListItem>
      ))}
    </List>
  );
}
