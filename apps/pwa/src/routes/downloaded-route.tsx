import { DownloadedPage } from "@/components/pages/downloaded";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";

export function DownloadedRoutePage() {
  return (
    <RequireSubscriptions>
      <AppPageLayout backTo="/library" title="Downloaded">
        <DownloadedPage />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
