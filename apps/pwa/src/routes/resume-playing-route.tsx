import { ResumePlayingPage } from "@/components/pages/resume-playing";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";

export function ResumePlayingRoutePage() {
  return (
    <RequireSubscriptions>
      <AppPageLayout backTo="/library" title="Resume Playing">
        <ResumePlayingPage />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
