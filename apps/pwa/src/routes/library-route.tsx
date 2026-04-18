import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";

import { LibraryPage } from "@/components/pages/library";
import { usePodcastStore } from "@/lib/store";
import { AppPageLayout, RequireSubscriptions } from "@/routes/content-layout";

export function LibraryRoutePage() {
  const isRefreshing = usePodcastStore((state) => state.isRefreshing);
  const refreshAllPodcasts = usePodcastStore((state) => state.refreshAllPodcasts);
  const setShowAddPodcastDialog = usePodcastStore((state) => state.setShowAddPodcastDialog);

  return (
    <RequireSubscriptions>
      <AppPageLayout
        title="Library"
        toolBar={[
          {
            disabled: isRefreshing,
            icon: <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />,
            label: "Refresh podcasts",
            onClick: async () => {
              try {
                await refreshAllPodcasts();
                toast.success("Podcasts refreshed successfully!");
              } catch {
                toast.error("Failed to refresh podcasts");
              }
            },
          },
          {
            icon: <Plus className="h-4 w-4" />,
            label: "Add podcast",
            onClick: () => setShowAddPodcastDialog(true),
          },
        ]}
      >
        <LibraryPage />
      </AppPageLayout>
    </RequireSubscriptions>
  );
}
