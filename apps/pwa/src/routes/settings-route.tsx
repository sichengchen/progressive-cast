import { SettingsPage } from "@/components/pages/settings";
import { AppPageLayout } from "@/routes/content-layout";

export function SettingsRoutePage() {
  return (
    <AppPageLayout title="Settings">
      <SettingsPage />
    </AppPageLayout>
  );
}
