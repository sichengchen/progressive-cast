"use client"

import { useEffect, useState } from 'react';
import { Play, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CoverImage } from '@/components/ui/cover-image';
import { EpisodeSkeleton } from './episode-skeleton';
import { usePodcastStore } from '@/lib/store';
import { formatTime } from '@/lib/utils';
import { format } from 'date-fns';
import type { Episode } from '@/lib/types';

interface EpisodeListProps {
    podcastId: string;
}

export function EpisodeList({ podcastId }: EpisodeListProps) {
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
    
    const {
        episodes,
        playbackProgress,
        loadEpisodes,
        playEpisode
    } = usePodcastStore();

    useEffect(() => {
        const loadPodcastEpisodes = async () => {
            setIsLoadingEpisodes(true);
            await loadEpisodes(podcastId);
            setIsLoadingEpisodes(false);
        };
        
        loadPodcastEpisodes();
    }, [podcastId, loadEpisodes]);

    const handlePlayEpisode = (episode: Episode, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        playEpisode(episode);
    };

    // Show skeleton while loading episodes
    if (isLoadingEpisodes) {
        return <EpisodeSkeleton />;
    }

    if (episodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                    <p>No episodes found</p>
                    <p className="text-sm">Try refreshing the podcast</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-3">
                <div className="space-y-0">
                    {episodes.map((episode, index) => {
                        const progress = playbackProgress.get(episode.id);

                        return (
                            <div key={episode.id}>
                                <Card
                                    className="relative cursor-pointer transition-colors hover:bg-accent group border-0 shadow-none bg-transparent"
                                    onClick={() => handlePlayEpisode(episode)}
                                >
                                    <CardContent className="px-3">
                                        <div className="flex items-center gap-4">
                                            <CoverImage
                                                src={episode.imageUrl}
                                                alt={episode.title}
                                                className="w-20 h-20"
                                            >
                                                {/* Play icon overlay only on cover area */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                                    <Play className="w-6 h-6 text-white fill-current" />
                                                </div>
                                            </CoverImage>

                                            <div className="flex-1 min-w-0">
                                                {/* Date above title */}
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
                                {index < episodes.length - 1 && (
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