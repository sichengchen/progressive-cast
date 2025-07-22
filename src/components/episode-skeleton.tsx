"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface EpisodeSkeletonProps {
  count?: number;
}

export function EpisodeSkeleton({ count = 10 }: EpisodeSkeletonProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3">
        <div className="space-y-0">
          {Array.from({ length: count }, (_, index) => (
            <div key={index}>
              <Card className="border-0 shadow-none">
                <CardContent className="px-3">
                  <div className="flex items-center gap-4">
                    {/* Cover image skeleton - matches w-20 h-20 */}
                    <Skeleton className="w-20 h-20 rounded" />

                    <div className="flex-1 min-w-0">
                      {/* Date skeleton - matches text-xs above title */}
                      <Skeleton className="h-3 w-20 mb-1" />
                      
                      {/* Episode title skeleton - matches font-medium line-clamp-2 */}
                      <Skeleton className="h-4 w-full max-w-md mb-1" />
                      <Skeleton className="h-4 w-3/4 mb-1" />

                      {/* Duration skeleton - matches Clock icon + time */}
                      <Skeleton className="h-3 w-16 mb-2" />

                      {/* Description skeleton - matches text-sm line-clamp-2 */}
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-4/5 mb-2" />

                      {/* Progress bar skeleton (optional) */}
                      <div className="flex items-center gap-2">
                        <Skeleton className="flex-1 h-1 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
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
      </div>
    </div>
  );
} 