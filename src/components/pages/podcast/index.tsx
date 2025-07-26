import { useIsMobile } from "@/hooks/use-mobile";
import { usePodcastStore } from "@/lib/store";

import { WelcomeScreen } from "@/components/common/welcome";

import { PodcastDetails } from "./podcast-details";
import { PodcastEpisodes } from "./episodes";

export const PodcastPage = () => {
    const { selectedPodcastId, podcasts } = usePodcastStore();
    const isMobile = useIsMobile();

    if (!selectedPodcastId) {
        return (
            <>
                {isMobile ? (
                    // Mobile layout - simplified
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                            <p className="text-lg">
                                Select a podcast to view details
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <p className="text-lg">
                                Select a podcast to view details
                            </p>
                        </div>
                    </div>
                )}
            </>
        );
    }

    const selectedPodcast = podcasts.find((p) => p.id === selectedPodcastId);

    if (!selectedPodcast) {
        return <WelcomeScreen />;
    }

    return (
        <>
            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    {/* Podcast Details Section - Fixed height to prevent layout shifts */}
                    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
                        <div className="p-6">
                            <PodcastDetails podcast={selectedPodcast} />
                        </div>
                    </div>

                    {/* Episodes List Section */}
                    <div className="flex-1 min-h-0">
                        <PodcastEpisodes podcastId={selectedPodcastId} />
                    </div>
                </div>
            </div>
        </>
    );
};
