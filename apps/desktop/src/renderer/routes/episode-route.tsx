import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";
import { EpisodePage } from "@/components/pages/episode";

export function EpisodeRoutePage({ episodeId }: { episodeId: string }) {
  return (
    <RequireSubscriptions>
      <AppPageLayout>
        <EpisodePage episodeId={episodeId} />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
