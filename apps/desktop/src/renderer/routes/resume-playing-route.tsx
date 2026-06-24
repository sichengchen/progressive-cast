import { useEffect } from "react";
import { ResumePlayingPage } from "@/components/pages/resume-playing";
import { usePodcastStore } from "@/lib/store";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";

export function ResumePlayingRoutePage() {
  const setCurrentPage = usePodcastStore((state) => state.setCurrentPage);

  useEffect(() => {
    setCurrentPage("resume-playing");
  }, [setCurrentPage]);

  return (
    <RequireSubscriptions>
      <AppPageLayout backTo="/library" title="Resume Playing">
        <ResumePlayingPage />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
