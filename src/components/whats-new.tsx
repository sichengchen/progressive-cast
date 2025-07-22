"use client"

import { useState, useEffect, useMemo } from 'react';
import { Play, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CoverImage } from '@/components/ui/cover-image';
import { usePodcastStore } from '@/lib/store';
import type { Episode } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { format } from 'date-fns';
import { EpisodeSkeleton } from './episode-skeleton';

export function WhatsNew() {
  const [latestEpisodes, setLatestEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    podcasts, 
    playEpisode, 
    preferences,
    playbackProgress 
  } = usePodcastStore();

  useEffect(() => {
    const loadLatestEpisodes = async () => {
      const startTime = performance.now();
      setIsLoading(true);
      
      try {
        // Use optimized store method that includes caching
        const episodes = await usePodcastStore.getState().getLatestEpisodes();
        setLatestEpisodes(episodes);
        
        // Performance monitoring in development
        if (process.env.NODE_ENV === 'development') {
          const loadTime = performance.now() - startTime;
          console.log(`What's New loaded in ${loadTime.toFixed(2)}ms with ${episodes.length} episodes`);
        }
      } catch (error) {
        console.error('Failed to load latest episodes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Early return if no podcasts
    if (podcasts.length === 0) {
      setIsLoading(false);
      return;
    }

    // Start loading immediately
    loadLatestEpisodes();
  }, [preferences.whatsNewCount, podcasts.length]);

  // Memoize episode processing to avoid recalculation on re-renders
  const processedEpisodes = useMemo(() => {
    return latestEpisodes.map(episode => ({
      ...episode,
      podcast: podcasts.find(p => p.id === episode.podcastId),
      progress: playbackProgress.get(episode.id),
    }));
  }, [latestEpisodes, podcasts, playbackProgress]);

  const handlePlayEpisode = (episode: Episode) => {
    playEpisode(episode);
  };

  // Early return for loading state with skeleton
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">What&apos;s New</h1>
          </div>
          <EpisodeSkeleton count={preferences.whatsNewCount || 10} />
        </div>
      </div>
    );
  }

  // Early return for empty state
  if (latestEpisodes.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">What&apos;s New</h1>
          </div>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">No episodes found</p>
              <p className="text-sm">Subscribe to some podcasts to see the latest episodes here</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">What&apos;s New</h1>
        </div>
        
        <div className="space-y-0 max-w-4xl mx-auto">
          {processedEpisodes.map((episodeData, index) => {
            const { podcast, progress, ...episode } = episodeData;
            
            return (
              <div key={episode.id}>
                <Card
                  className="relative cursor-pointer transition-colors hover:bg-accent group border-0 shadow-none"
                  onClick={() => handlePlayEpisode(episode)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-4">
                      <CoverImage
                        src={episode.imageUrl || podcast?.imageUrl}
                        alt={episode.title}
                        className="w-24 h-24 md:w-32 md:h-32"
                      >
                        {/* Play icon overlay only on cover area */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-current" />
                        </div>
                      </CoverImage>

                      <div className="flex-1 min-w-0">
                        {/* Podcast title above date */}
                        {podcast && (
                          <p className="text-xs text-muted-foreground mb-1 truncate">
                            {podcast.title}
                          </p>
                        )}
                        
                        {/* Date */}
                        <p className="text-xs text-muted-foreground mb-1">
                          {format(new Date(episode.publishedAt), 'MMM d, yyyy')}
                        </p>

                        <h3 className="font-medium line-clamp-2 mb-1">
                          {episode.title}
                        </h3>

                        {episode.duration && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <Clock className="w-3 h-3" />
                            {formatTime(episode.duration)}
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {episode.description}
                        </p>

                        {progress && progress.currentTime > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary rounded-full h-1">
                              <div
                                className="bg-primary h-1 rounded-full"
                                style={{
                                  width: `${(progress.currentTime / progress.duration) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Add separator except for the last item */}
                {index < processedEpisodes.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 