import { useEffect } from "react";
import { DownloadedPage } from "@/components/pages/downloaded";
import { usePodcastStore } from "@/lib/store";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";

export function DownloadedRoutePage() {
  const setCurrentPage = usePodcastStore((state) => state.setCurrentPage);

  useEffect(() => {
    setCurrentPage("downloaded");
  }, [setCurrentPage]);

  return (
    <RequireSubscriptions>
      <AppPageLayout backTo="/library" title="Downloaded">
        <DownloadedPage />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
