import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";
import { WhatsNewPage } from "@/components/pages/whats-new";

export function WhatsNewRoutePage() {
  return (
    <RequireSubscriptions>
      <AppPageLayout title="What's New">
        <WhatsNewPage />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
