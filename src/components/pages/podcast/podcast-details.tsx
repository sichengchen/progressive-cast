"use client";

import { useState, useEffect, useMemo } from "react";
import { Globe, Trash2, Play, User, Clock, Tag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { usePodcastStore } from "@/lib/store";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import ISO6391 from "iso-639-1";
import type { Podcast } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface PodcastDetailsProps {
    podcast: Podcast;
}

export function PodcastDetails({ podcast }: PodcastDetailsProps) {
    const [isUnsubscribing, setIsUnsubscribing] = useState(false);
    const [buttonState, setButtonState] = useState<
        "loading" | "hasEpisodes" | "noEpisodes"
    >("loading");
    const isMobile = useIsMobile();

    const {
        episodes,
        playEpisode,
        unsubscribeFromPodcast,
        setSelectedPodcast,
    } = usePodcastStore();

    // Get episodes for this specific podcast
    const podcastEpisodes = useMemo(
        () => episodes.filter((episode) => episode.podcastId === podcast.id),
        [episodes, podcast.id]
    );

    // Get the latest episode for this podcast
    const latestEpisode = useMemo(
        () =>
            podcastEpisodes.sort(
                (a, b) =>
                    new Date(b.publishedAt).getTime() -
                    new Date(a.publishedAt).getTime()
            )[0],
        [podcastEpisodes]
    );

    // Manage button state with smooth transitions
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (latestEpisode) {
            // If we have episodes, immediately show the button
            setButtonState("hasEpisodes");
        } else {
            // If no episodes, add a small delay before showing "no episodes"
            // This prevents flashing during podcast switching
            timeoutId = setTimeout(() => {
                setButtonState("noEpisodes");
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
        setButtonState("loading");
    }, [podcast.id]);

    const handlePlayLatest = () => {
        if (latestEpisode) {
            playEpisode(latestEpisode);
            toast.success(`Playing: ${latestEpisode.title}`);
        } else {
            toast.error("No episodes available");
        }
    };

    const handleUnsubscribe = async () => {
        setIsUnsubscribing(true);
        try {
            await unsubscribeFromPodcast(podcast.id);
            setSelectedPodcast(null); // Clear selection after unsubscribing
            toast.success(`Unsubscribed from ${podcast.title}`);
        } catch (error) {
            toast.error("Failed to unsubscribe");
            console.error("Unsubscribe error:", error);
        } finally {
            setIsUnsubscribing(false);
        }
    };

    return (
        <div className="py-6 px-2">
            <div className="flex flex-row gap-4 md:gap-8 md:items-start">
                {/* Podcast Cover */}
                <div className="flex-shrink-0 self-start">
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
                            className="w-40 h-40 rounded-lg shadow-md"
                        />
                    )}
                </div>

                {/* Podcast Info */}
                <div className="flex-1 min-w-0 text-left md:h-40 md:flex md:flex-col md:justify-between">
                    {/* Title, Author & Meta Info */}
                    <div className="space-y-2">
                        {/* Podcast Meta Info */}
                        <div className="space-y-2">
                            <div className="flex flex-col gap-2 md:flex-row text-sm text-muted-foreground">
                                {podcast.author && (
                                    <div className="flex items-center justify-start gap-1">
                                        <User className="w-4 h-4" />
                                        <span>{podcast.author}</span>
                                    </div>
                                )}

                                {podcast.language && (
                                    <div className="flex items-center justify-start gap-1">
                                        <Globe className="w-4 h-4" />
                                        <span>
                                            {ISO6391.getName(
                                                podcast.language.split("-")[0]
                                            ) || podcast.language}
                                        </span>
                                    </div>
                                )}

                                {!isMobile &&
                                    podcast.categories &&
                                    podcast.categories.length > 0 && (
                                        <div className="flex items-center justify-start gap-1">
                                            <Tag className="w-4 h-4" />
                                            <span>
                                                {podcast.categories
                                                    .slice(0, 2)
                                                    .join(", ")}
                                                {podcast.categories.length > 2
                                                    ? "..."
                                                    : ""}
                                            </span>
                                        </div>
                                    )}

                                <div className="flex items-center justify-start gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {isMobile ? "" : "Updated "}
                                        {latestEpisode ? formatDistanceToNow(
                                            new Date(latestEpisode.publishedAt),
                                            { addSuffix: true }
                                        ) : "No episodes"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        {isMobile ? (
                            <></>
                        ) : (
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2">
                                    {podcast.title}
                                </h1>
                            </div>
                        )}

                        {/* Description */}
                        <div className="text-sm text-muted-foreground md:mx-0">
                            {/* Desktop: Show truncated text with button */}
                            <div className="hidden md:flex items-start gap-2 w-3/5">
                                <div className="line-clamp-1 flex-1">
                                    {podcast.description}
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="link"
                                            className="text-sm p-0 h-auto"
                                        >
                                            Show Description
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {podcast.title}
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="max-h-96 overflow-y-auto">
                                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                {podcast.description ||
                                                    "No description available."}
                                            </p>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 md:gap-4 flex-row mt-4 md:mt-0 md:justify-start">
                        <Button
                            onClick={handlePlayLatest}
                            disabled={buttonState !== "hasEpisodes"}
                            size="default"
                            className="flex items-center gap-2 w-auto md:h-10 md:px-8"
                        >
                            {buttonState === "loading" ? (
                                <>
                                    <div className="h-4 w-4 animate-spin">
                                        <div className="h-full w-full border-2 border-current border-t-transparent rounded-full" />
                                    </div>
                                    <span className="hidden sm:inline">
                                        Loading Episodes...
                                    </span>
                                    <span className="sm:hidden">
                                        Loading...
                                    </span>
                                </>
                            ) : buttonState === "hasEpisodes" ? (
                                <>
                                    <Play className="h-4 w-4" />
                                    <span className="hidden sm:inline">
                                        Play Latest Episode
                                    </span>
                                    <span className="sm:hidden">
                                        Latest
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 opacity-50" />
                                    <span className="hidden sm:inline">
                                        No Episodes Available
                                    </span>
                                    <span className="sm:hidden">
                                        No Episodes
                                    </span>
                                </>
                            )}
                        </Button>

                        {/* Mobile: Only show button */}
                        <div className="md:hidden flex justify-start">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="text-sm p-0 h-auto"
                                    >
                                        <Info />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {podcast.title}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="max-h-96 overflow-y-auto">
                                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                            {podcast.description ||
                                                "No description available."}
                                        </p>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant={isMobile ? "outline" : "ghost"}
                                    size="default"
                                    className="flex items-center gap-2 text-destructive hover:text-destructive w-auto md:h-10 md:px-3"
                                    disabled={isUnsubscribing}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {!isMobile && <span>Unsubscribe</span>}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Unsubscribe from podcast?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to unsubscribe
                                        from &ldquo;{podcast.title}&rdquo;? This
                                        will remove the podcast and all its
                                        episodes from your library. This action
                                        cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleUnsubscribe}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        {isUnsubscribing
                                            ? "Unsubscribing..."
                                            : "Unsubscribe"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
        </div>
    );
}
