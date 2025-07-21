"use client"

import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';

interface EpisodeSkeletonProps {
  count?: number;
}

export function EpisodeSkeleton({ count = 5 }: EpisodeSkeletonProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="space-y-0">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index}>
              <div className="p-3">
                <div className="flex items-center gap-4">
                  {/* Episode image skeleton */}
                  <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    {/* Date skeleton */}
                    <Skeleton className="h-3 w-20 mb-1" />
                    
                    {/* Title skeleton - 2 lines */}
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    
                    {/* Duration skeleton */}
                    <div className="flex items-center gap-1 mb-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    
                    {/* Description skeleton - 2 lines */}
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                </div>
              </div>
              
              {/* Separator except for last item */}
              {index < count - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 