"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface EpisodeSkeletonProps {
  count?: number;
}

export function EpisodeSkeleton({ count = 10 }: EpisodeSkeletonProps) {
  return (
    <div className="space-y-0 max-w-4xl mx-auto">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Card className="border-0 shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                {/* Cover image skeleton */}
                <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded" />

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Podcast title skeleton */}
                  <Skeleton className="h-3 w-32" />
                  
                  {/* Date skeleton */}
                  <Skeleton className="h-3 w-24" />

                  {/* Episode title skeleton */}
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-4 w-3/4" />

                  {/* Duration skeleton */}
                  <Skeleton className="h-3 w-16" />

                  {/* Description skeleton */}
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Separator except for the last item */}
          {index < count - 1 && (
            <Separator className="my-2" />
          )}
        </div>
      ))}
    </div>
  );
} 