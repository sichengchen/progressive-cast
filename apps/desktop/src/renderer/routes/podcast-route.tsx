import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePodcastStore } from "@/lib/store";
import { WelcomeScreen } from "@/components/common/welcome";
import { PodcastEpisodes } from "@/components/pages/podcast/episodes";
import { PodcastDetails } from "@/components/pages/podcast/podcast-details";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";
import type { Episode } from "@/lib/types";

const emptyEpisodes: Episode[] = [];

export function PodcastRoutePage({ podcastId }: { podcastId: string }) {
  const isMobile = useIsMobile();
  const podcasts = usePodcastStore((state) => state.podcasts);
  const podcastEpisodes = usePodcastStore(
    (state) => state.episodeCache.get(podcastId) ?? emptyEpisodes,
  );
  const pageState = usePodcastStore((state) => state.episodePageState.get(podcastId));
  const setCurrentPage = usePodcastStore((state) => state.setCurrentPage);
  const setSelectedPodcast = usePodcastStore((state) => state.setSelectedPodcast);

  const podcast = podcasts.find((item) => item.id === podcastId);

  useEffect(() => {
    setCurrentPage("podcasts");
    setSelectedPodcast(podcastId);
  }, [podcastId, setCurrentPage, setSelectedPodcast]);

  return (
    <RequireSubscriptions>
      <AppPageLayout backTo="/library" title={isMobile ? podcast?.title : undefined}>
        {podcast ? (
          <>
            <PodcastDetails
              episodes={podcastEpisodes}
              isLoadingEpisodes={Boolean(!pageState?.loaded)}
              podcast={podcast}
            />
            <PodcastEpisodes podcastId={podcastId} />
          </>
        ) : (
          <WelcomeScreen />
        )}
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
