"use client"

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Globe, Trash2, Play, Headphones, Tag, FileText } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

  // Description processing - remove all line breaks and always show "Show More"
  const cleanDescription = podcast.description
    ? podcast.description.replace(/\s+/g, ' ').trim()
    : '';
  const shouldShowMore = cleanDescription.length > 0;

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="p-0">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8 md:items-start">
          {/* Podcast Cover - Aligned with content height */}
          <div className="flex-shrink-0 self-center md:self-start">
            {podcast.imageUrl ? (
              <img
                src={podcast.imageUrl}
                alt={podcast.title}
                className="w-32 h-32 md:w-40 md:h-40 rounded-lg object-cover shadow-md"
              />
            ) : (
              <CoverImage
                src={undefined}
                alt={podcast.title}
                className="w-32 h-32 md:w-40 md:h-40 rounded-lg shadow-md"
              />
            )}
          </div>

          {/* Podcast Info */}
          <div className="flex-1 min-w-0 text-center md:text-left md:h-40 md:flex md:flex-col md:justify-between">
            {/* Title, Author & Meta Info - Grouped together */}
            <div className="space-y-2">
              {/* Podcast Meta Info - Split into two lines for better readability */}
              <div className="space-y-2">
                {/* First row: Episodes and Language */}
                <div className="flex flex-col gap-2 md:flex-row text-sm text-muted-foreground">
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
              </div>

              {/* Title & Author */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2">
                  {podcast.title}
                </h1>

                {podcast.author && (
                  <p className="text-lg md:text-xl text-muted-foreground">
                    by {podcast.author}
                  </p>
                )}
              </div>

              {/* Description: Only 1 line, with a link "Show Description" at the end */}
              <div className="flex items-start gap-2 w-5/6 md:w-3/5 text-sm text-muted-foreground mx-auto md:mx-0">
                <div className="line-clamp-1 flex-1">
                  {podcast.description}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="text-sm p-0 h-auto">Show Description</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{podcast.title}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {podcast.description || 'No description available.'}
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 md:flex-row md:gap-4 mt-4 md:mt-0">
              <Button
                onClick={handlePlayLatest}
                disabled={buttonState !== 'hasEpisodes'}
                size="default"
                className="flex items-center gap-2 w-full md:w-auto md:h-10 md:px-8"
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
                    variant="ghost"
                    size="default"
                    className="flex items-center gap-2 text-destructive hover:text-destructive w-full md:w-auto md:h-10 md:px-3"
                    disabled={isUnsubscribing}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Unsubscribe</span>
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
    </Card>
  );
} 