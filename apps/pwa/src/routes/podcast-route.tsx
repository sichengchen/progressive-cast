import { useIsMobile } from "@/hooks/use-mobile";
import { usePodcastStore } from "@/lib/store";
import { WelcomeScreen } from "@/components/common/welcome";
import { PodcastEpisodes } from "@/components/pages/podcast/episodes";
import { PodcastDetails } from "@/components/pages/podcast/podcast-details";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";

export function PodcastRoutePage({ podcastId }: { podcastId: string }) {
  const isMobile = useIsMobile();
  const podcasts = usePodcastStore((state) => state.podcasts);

  const podcast = podcasts.find((item) => item.id === podcastId);

  return (
    <RequireSubscriptions>
      <AppPageLayout backTo="/library" title={isMobile ? podcast?.title : undefined}>
        {podcast ? (
          <>
            <PodcastDetails podcast={podcast} />
            <PodcastEpisodes podcastId={podcastId} />
          </>
        ) : (
          <WelcomeScreen />
        )}
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
