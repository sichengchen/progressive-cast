"use client"

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Globe, Trash2, Play, Headphones, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CoverImage } from '@/components/ui/cover-image';
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { usePodcastStore } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Podcast } from '@/lib/types';

interface PodcastDetailsProps {
  podcast: Podcast;
}

export function PodcastDetails({ podcast }: PodcastDetailsProps) {
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [buttonState, setButtonState] = useState<'loading' | 'hasEpisodes' | 'noEpisodes'>('loading');
  
  const { 
    episodes, 
    playEpisode, 
    unsubscribeFromPodcast,
    setSelectedPodcast 
  } = usePodcastStore();

  // Get episodes for this specific podcast
  const podcastEpisodes = useMemo(() => 
    episodes.filter(episode => episode.podcastId === podcast.id),
    [episodes, podcast.id]
  );
  
  // Get the latest episode for this podcast
  const latestEpisode = useMemo(() => 
    podcastEpisodes
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0],
    [podcastEpisodes]
  );

  // Manage button state with smooth transitions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (latestEpisode) {
      // If we have episodes, immediately show the button
      setButtonState('hasEpisodes');
    } else {
      // If no episodes, add a small delay before showing "no episodes"
      // This prevents flashing during podcast switching
      timeoutId = setTimeout(() => {
        setButtonState('noEpisodes');
      }, 300); // 300ms delay to allow for loading
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [latestEpisode]);

  // Reset to loading state when podcast changes
  useEffect(() => {
    setButtonState('loading');
  }, [podcast.id]);

  const handlePlayLatest = () => {
    if (latestEpisode) {
      playEpisode(latestEpisode);
      toast.success(`Playing: ${latestEpisode.title}`);
    } else {
      toast.error('No episodes available');
    }
  };

  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);
    try {
      await unsubscribeFromPodcast(podcast.id);
      setSelectedPodcast(null); // Clear selection after unsubscribing
      toast.success(`Unsubscribed from ${podcast.title}`);
    } catch (error) {
      toast.error('Failed to unsubscribe');
      console.error('Unsubscribe error:', error);
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const totalEpisodes = podcastEpisodes.length;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* Podcast Cover */}
          <div className="flex-shrink-0 self-center md:self-start">
            {podcast.imageUrl ? (
              <img
                src={podcast.imageUrl}
                alt={podcast.title}
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover shadow-md"
              />
            ) : (
              <CoverImage 
                src={undefined}
                alt={podcast.title}
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg shadow-md"
              />
            )}
          </div>

          {/* Podcast Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold mb-2 line-clamp-2">
              {podcast.title}
            </h1>
            
            {podcast.author && (
              <p className="text-base md:text-lg text-muted-foreground mb-3">
                by {podcast.author}
              </p>
            )}

            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center justify-center md:justify-start gap-1">
                <Calendar className="w-4 h-4" />
                <span>Subscribed {format(new Date(podcast.subscriptionDate), 'MMM d, yyyy')}</span>
              </div>
              
              <div className="flex items-center justify-center md:justify-start gap-1">
                <Headphones className="w-4 h-4" />
                <span>{totalEpisodes} episodes</span>
              </div>

              {podcast.language && (
                <div className="flex items-center justify-center md:justify-start gap-1">
                  <Globe className="w-4 h-4" />
                  <span>{podcast.language}</span>
                </div>
              )}
            </div>

            {/* Categories */}
            {podcast.categories && podcast.categories.length > 0 && (
              <div className="flex flex-col md:flex-row items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {podcast.categories.slice(0, 3).map((category, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                    >
                      {category}
                    </span>
                  ))}
                  {podcast.categories.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{podcast.categories.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 md:flex-row md:gap-3">
              <Button 
                onClick={handlePlayLatest}
                disabled={buttonState !== 'hasEpisodes'}
                size="default"
                className="flex items-center gap-2 w-full md:w-auto md:h-10 md:px-6"
              >
                {buttonState === 'loading' ? (
                  <>
                    <div className="h-4 w-4 animate-spin">
                      <div className="h-full w-full border-2 border-current border-t-transparent rounded-full" />
                    </div>
                    <span className="hidden sm:inline">Loading Episodes...</span>
                    <span className="sm:hidden">Loading...</span>
                  </>
                ) : buttonState === 'hasEpisodes' ? (
                  <>
                    <Play className="h-4 w-4" />
                    <span className="hidden sm:inline">Play Latest Episode</span>
                    <span className="sm:hidden">Play Latest</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 opacity-50" />
                    <span className="hidden sm:inline">No Episodes Available</span>
                    <span className="sm:hidden">No Episodes</span>
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="default"
                    className="flex items-center gap-2 text-destructive hover:text-destructive w-full md:w-auto md:h-10 md:px-6"
                    disabled={isUnsubscribing}
                  >
                    <Trash2 className="w-4 h-4" />
                    Unsubscribe
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unsubscribe from podcast?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to unsubscribe from &ldquo;{podcast.title}&rdquo;? 
                      This will remove the podcast and all its episodes from your library. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleUnsubscribe}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isUnsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Podcast Description */}
      <CardContent className="pt-0">
        {podcast.description && (
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p className="whitespace-pre-wrap">{podcast.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 