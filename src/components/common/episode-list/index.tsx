"use client";

import { Play, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CoverImage } from "@/components/ui/cover-image";
import { DownloadButton } from "@/components/ui/download-button";
import { formatTime } from "@/lib/utils";
import { format } from "date-fns";
import type { Episode, PlaybackProgress } from "@/lib/types";

import { EpisodeSkeleton } from "./episode-skeleton";

interface EpisodeListProps {
    isLoadingEpisodes: boolean;
    episodes: Episode[];
    playbackProgress: Map<string, PlaybackProgress>;
    playEpisode: (episode: Episode) => void;
    noEpisodesMessage?: string;
    noEpisodesMessageDescription?: string;
}

export function EpisodeList({
    isLoadingEpisodes,
    episodes,
    playbackProgress,
    playEpisode,
    noEpisodesMessage,
    noEpisodesMessageDescription,
}: EpisodeListProps) {
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
                    <p>{noEpisodesMessage ?? "No episodes found"}</p>
                    <p className="text-sm">
                        {noEpisodesMessageDescription ??
                            "Try refreshing the podcast"}
                    </p>
                </div>
            </div>
        );
    }

    return (
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
                                            {format(
                                                new Date(episode.publishedAt),
                                                "MMM d, yyyy"
                                            )}
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

                                        {progress &&
                                            progress.currentTime > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-secondary rounded-full h-1">
                                                        <div
                                                            className="bg-primary h-1 rounded-full"
                                                            style={{
                                                                width: `${
                                                                    (progress.currentTime /
                                                                        progress.duration) *
                                                                    100
                                                                }%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatTime(
                                                            progress.currentTime
                                                        )}{" "}
                                                        /{" "}
                                                        {formatTime(
                                                            progress.duration
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                    </div>

                                    {/* Download button */}
                                    <div className="flex-shrink-0 ml-2">
                                        <DownloadButton episode={episode} />
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
    );
}
