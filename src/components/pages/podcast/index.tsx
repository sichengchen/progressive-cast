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
            {/* Podcast Details Section - Fixed height to prevent layout shifts */}
            <PodcastDetails podcast={selectedPodcast} />

            {/* Episodes List Section */}
            <PodcastEpisodes podcastId={selectedPodcastId} />
        </>
    );
};
