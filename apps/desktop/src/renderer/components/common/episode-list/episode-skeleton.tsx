"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  List,
  ListItem,
  ListItemActions,
  ListItemLeading,
  ListItemContent,
  ListItemMeta,
} from "@/components/ui-custom/list";

interface EpisodeSkeletonProps {
  count?: number;
}

export function EpisodeSkeleton({ count = 10 }: EpisodeSkeletonProps) {
  return (
    <List className="px-0">
      {Array.from({ length: count }, (_, index) => (
        <ListItem key={index} className="px-2 py-2.5 after:left-[4.25rem] after:right-2">
          <ListItemLeading>
            <Skeleton className="size-12 rounded-md" />
          </ListItemLeading>

          <ListItemContent className="flex flex-col gap-1.5">
            <ListItemMeta>
              <Skeleton className="h-3 w-16" />
            </ListItemMeta>

            <div className="font-medium leading-none tracking-tight">
              <Skeleton className="mb-1 h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-3.5 w-full max-w-xl" />
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
