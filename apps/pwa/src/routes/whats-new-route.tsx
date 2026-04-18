import { useEffect } from "react";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";
import { WhatsNewPage } from "@/components/pages/whats-new";
import { usePodcastStore } from "@/lib/store";

export function WhatsNewRoutePage() {
  const setCurrentPage = usePodcastStore((state) => state.setCurrentPage);

  useEffect(() => {
    setCurrentPage("whats-new");
  }, [setCurrentPage]);

  return (
    <RequireSubscriptions>
      <AppPageLayout title="What's New">
        <WhatsNewPage />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
