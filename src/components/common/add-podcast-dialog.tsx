"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, ExternalLink, Plus } from "lucide-react";
import { usePodcastStore } from "@/lib/store";
import { iTunesService, type iTunesPodcast } from "@/lib/itunes-service";
import { toast } from "sonner";

interface AddPodcastDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddPodcastDialog({
    open,
    onOpenChange,
}: AddPodcastDialogProps) {
    const [feedUrl, setFeedUrl] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [itunesResults, setItunesResults] = useState<iTunesPodcast[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const {
        subscribeToPodcast,
        clearError,
        progressDialog,
        podcasts,
        preferences,
    } = usePodcastStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedUrl.trim()) return;

        clearError();

        await subscribeToPodcast(feedUrl.trim());

        // Check if there was an error after the subscription attempt
        const currentState = usePodcastStore.getState();
        if (currentState.error) {
            toast.error(currentState.error);
        } else {
            setFeedUrl("");
            onOpenChange(false);
            toast.success("Podcast added successfully!");
        }
    };

    const handleItunesSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        try {
            const results = await iTunesService.searchPodcasts(
                searchQuery.trim(),
                20
            );

            // Filter out already subscribed podcasts
            const unsubscribedPodcasts = results.results.filter(
                (itunesPodcast) =>
                    !podcasts.some(
                        (localPodcast) =>
                            localPodcast.feedUrl === itunesPodcast.feedUrl
                    )
            );

            setItunesResults(unsubscribedPodcasts);

            if (unsubscribedPodcasts.length === 0) {
                toast.info(
                    "No new podcasts found or all results are already subscribed"
                );
            }
        } catch (error) {
            toast.error("Failed to search iTunes");
            console.error("iTunes search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubscribeFromItunes = async (itunesPodcast: iTunesPodcast) => {
        if (!itunesPodcast.feedUrl) {
            toast.error("This podcast does not have a valid RSS feed URL");
            return;
        }

        try {
            await subscribeToPodcast(itunesPodcast.feedUrl);
            toast.success(`Subscribed to ${itunesPodcast.title}`);

            // Remove from search results
            setItunesResults((prev) =>
                prev.filter((p) => p.id !== itunesPodcast.id)
            );

            // Close dialog if this was the only result or user preference
            if (itunesResults.length <= 1) {
                handleClose();
            }
        } catch (error) {
            toast.error("Failed to subscribe to podcast");
            console.error("Subscribe error:", error);
        }
    };

    const handleClose = () => {
        setFeedUrl("");
        setSearchQuery("");
        setItunesResults([]);
        setHasSearched(false);
        clearError();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add New Podcast</DialogTitle>
                    <DialogDescription>
                        Add a podcast by RSS feed URL or search iTunes for new
                        podcasts.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <Tabs
                        defaultValue={
                            preferences.itunesSearchEnabled ?? true
                                ? "search"
                                : "url"
                        }
                        className="h-full flex flex-col"
                    >
                        {(preferences.itunesSearchEnabled ?? true) && (
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger
                                    value="search"
                                    disabled={progressDialog.isOpen}
                                >
                                    Search iTunes
                                </TabsTrigger>
                                <TabsTrigger
                                    value="url"
                                    disabled={progressDialog.isOpen}
                                >
                                    RSS URL
                                </TabsTrigger>
                            </TabsList>
                        )}

                        <TabsContent
                            value="url"
                            className="flex-1 min-h-0 overflow-hidden"
                        >
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-4 py-4"
                            >
                                <div>
                                    <Label htmlFor="feedUrl">
                                        RSS Feed URL
                                    </Label>
                                    <Input
                                        id="feedUrl"
                                        type="url"
                                        placeholder="https://example.com/feed.xml"
                                        value={feedUrl}
                                        onChange={(e) =>
                                            setFeedUrl(e.target.value)
                                        }
                                        disabled={progressDialog.isOpen}
                                        className="mt-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={
                                            progressDialog.isOpen ||
                                            !feedUrl.trim()
                                        }
                                    >
                                        {progressDialog.isOpen
                                            ? "Adding..."
                                            : "Add Podcast"}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        {(preferences.itunesSearchEnabled ?? true) && (
                            <TabsContent
                                value="search"
                                className="flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
                            >
                                <div className="flex-1 min-h-0 pt-4 pb-2 flex flex-col">
                                    <form
                                        onSubmit={handleItunesSearch}
                                        className="space-y-4 flex-shrink-0"
                                    >
                                        <div>
                                            <Label htmlFor="searchQuery">
                                                Search
                                            </Label>
                                            <div className="flex gap-2 mt-1">
                                                <Input
                                                    id="searchQuery"
                                                    type="text"
                                                    placeholder="Enter podcast name or keywords..."
                                                    value={searchQuery}
                                                    onChange={(e) => {
                                                        setSearchQuery(
                                                            e.target.value
                                                        );
                                                        if (hasSearched) {
                                                            setHasSearched(
                                                                false
                                                            );
                                                            setItunesResults(
                                                                []
                                                            );
                                                        }
                                                    }}
                                                    disabled={
                                                        isSearching ||
                                                        progressDialog.isOpen
                                                    }
                                                    className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                />
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        isSearching ||
                                                        !searchQuery.trim() ||
                                                        progressDialog.isOpen
                                                    }
                                                    className="px-4"
                                                >
                                                    <Search className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </form>

                                    {/* Search Results */}
                                    <div className="flex-1 min-h-0 mt-4 flex flex-col">
                                        {isSearching ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="text-center text-muted-foreground">
                                                    <div className="mb-2">
                                                        Searching iTunes...
                                                    </div>
                                                    <div className="text-sm">
                                                        This may take a few
                                                        seconds
                                                    </div>
                                                </div>
                                            </div>
                                        ) : itunesResults.length > 0 ? (
                                            <div className="flex-1 overflow-y-auto min-h-0 max-h-96">
                                                <div className="space-y-3 pb-4">
                                                    {itunesResults.map(
                                                        (podcast) => (
                                                            <Card
                                                                key={podcast.id}
                                                            >
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-start gap-3">
                                                                        {podcast.imageUrl && (
                                                                            <img
                                                                                src={
                                                                                    podcast.imageUrl
                                                                                }
                                                                                alt={
                                                                                    podcast.title
                                                                                }
                                                                                className="w-16 h-16 rounded object-cover flex-shrink-0"
                                                                            />
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="font-medium truncate">
                                                                                {
                                                                                    podcast.title
                                                                                }
                                                                            </h4>
                                                                            <p className="text-sm text-muted-foreground truncate">
                                                                                {
                                                                                    podcast.author
                                                                                }
                                                                            </p>
                                                                            {podcast.genre && (
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {
                                                                                        podcast.genre
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                            {podcast.description && (
                                                                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 break-words">
                                                                                    {
                                                                                        podcast.description
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                                            {podcast.itunesUrl && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    onClick={() =>
                                                                                        window.open(
                                                                                            podcast.itunesUrl,
                                                                                            "_blank"
                                                                                        )
                                                                                    }
                                                                                    className="h-8 w-8 p-0"
                                                                                    title="View in iTunes"
                                                                                >
                                                                                    <ExternalLink className="h-4 w-4" />
                                                                                </Button>
                                                                            )}
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    handleSubscribeFromItunes(
                                                                                        podcast
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !podcast.feedUrl ||
                                                                                    progressDialog.isOpen
                                                                                }
                                                                                className="h-8 px-3"
                                                                            >
                                                                                <Plus className="h-3 w-3 mr-1" />
                                                                                Subscribe
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ) : hasSearched &&
                                          itunesResults.length === 0 &&
                                          !isSearching ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="text-center text-muted-foreground">
                                                    <div className="mb-2">
                                                        No podcasts found
                                                    </div>
                                                    <div className="text-sm">
                                                        Try different keywords
                                                        or check your spelling
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="text-center text-muted-foreground">
                                                    <div className="mb-2">
                                                        Search iTunes for new
                                                        podcasts
                                                    </div>
                                                    <div className="text-sm">
                                                        Enter keywords to
                                                        discover podcasts you
                                                        haven&apos;t subscribed
                                                        to
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
