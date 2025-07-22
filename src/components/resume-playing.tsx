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

export function ResumePlaying() {
  const [unfinishedEpisodes, setUnfinishedEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    podcasts, 
    playEpisode, 
    playbackProgress 
  } = usePodcastStore();

  useEffect(() => {
    const loadUnfinishedEpisodes = async () => {
      const startTime = performance.now();
      setIsLoading(true);
      
      try {
        // Get unfinished episodes from store
        const episodes = await usePodcastStore.getState().getUnfinishedEpisodes();
        setUnfinishedEpisodes(episodes);
        
        // Performance monitoring in development
        if (process.env.NODE_ENV === 'development') {
          const loadTime = performance.now() - startTime;
          console.log(`Resume Playing loaded in ${loadTime.toFixed(2)}ms with ${episodes.length} episodes`);
        }
      } catch (error) {
        console.error('Failed to load unfinished episodes:', error);
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
    loadUnfinishedEpisodes();
  }, [podcasts.length, playbackProgress]);

  // Memoize episode processing to avoid recalculation on re-renders
  const processedEpisodes = useMemo(() => {
    return unfinishedEpisodes.map(episode => ({
      ...episode,
      podcast: podcasts.find(p => p.id === episode.podcastId),
      progress: playbackProgress.get(episode.id),
    }));
  }, [unfinishedEpisodes, podcasts, playbackProgress]);

  const handlePlayEpisode = (episode: Episode) => {
    playEpisode(episode);
  };

  // Early return for loading state with skeleton
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="px-6 py-3 mt-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Resume Playing</h1>
          </div>
          <EpisodeSkeleton count={10} />
        </div>
      </div>
    );
  }

  // Early return for empty state
  if (unfinishedEpisodes.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="px-6 py-3 mt-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Resume Playing</h1>
          </div>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">No episodes to resume</p>
              <p className="text-sm">Start playing some episodes to see them here</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-3 mt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Resume Playing</h1>
        </div>
        
        <div className="space-y-0">
          {processedEpisodes.map((episodeData, index) => {
            const { podcast, progress, ...episode } = episodeData;
            
            return (
              <div key={episode.id}>
                <Card
                  className="relative cursor-pointer transition-colors hover:bg-accent group border-0 shadow-none bg-transparent"
                  onClick={() => handlePlayEpisode(episode)}
                >
                  <CardContent className="px-3">
                    <div className="flex items-center gap-4">
                      <CoverImage
                        src={episode.imageUrl || podcast?.imageUrl}
                        alt={episode.title}
                        className="w-20 h-20"
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