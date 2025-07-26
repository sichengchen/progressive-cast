"use client"

import { Skeleton } from '@/components/ui/skeleton';
import {
  List,
  ListItem,
  ListItemLeading,
  ListItemContent,
  ListItemTrailing,
  ListItemMeta,
} from "@/components/ui-custom/list";

interface EpisodeSkeletonProps {
  count?: number;
}

export function EpisodeSkeleton({ count = 10 }: EpisodeSkeletonProps) {
  return (
    <List className="px-0">
      {Array.from({ length: count }, (_, index) => (
        <ListItem key={index} className="px-2">
          <ListItemLeading>
            {/* Cover image skeleton - matches w-20 h-20 */}
            <Skeleton className="w-20 h-20 rounded" />
          </ListItemLeading>

          <ListItemContent className="space-y-1">
            {/* Date and duration skeleton - matches ListItemMeta with date + duration */}
            <ListItemMeta>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-20" />
                <span className="flex items-center gap-1">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </span>
              </div>
            </ListItemMeta>

            {/* Episode title skeleton - matches ListItemTitle with line-clamp-2 */}
            <div className="font-medium leading-none tracking-tight">
              <Skeleton className="h-4 w-full max-w-md mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Description skeleton - matches ListItemDescription with line-clamp-2 */}
            <div className="text-sm text-muted-foreground mt-1">
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-4/5" />
            </div>

            {/* Progress bar skeleton (optional) - matches actual progress bar */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1">
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </ListItemContent>

          <ListItemTrailing>
            {/* Download button skeleton */}
            <Skeleton className="w-8 h-8 rounded-full" />
          </ListItemTrailing>
        </ListItem>
      ))}
    </List>
  );
} 