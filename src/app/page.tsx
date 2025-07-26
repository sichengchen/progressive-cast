"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PodcastSidebar } from "@/components/common/sidebar";
import { MainContent } from "@/components/pages";
import { AudioPlayer } from "@/components/common/audio-player";
import { LoadingScreen } from "@/components/common/loading-screen";
import { ProgressDialog } from "@/components/common/progress-dialog";
import { usePodcastStore } from "@/lib/store";

export default function HomePage() {
  const { isLoading } = usePodcastStore();

  // Show loading screen during app initialization
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "20rem"
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full">
        <PodcastSidebar />
        <SidebarInset className="flex flex-col">
          <MainContent />
          <AudioPlayer />
        </SidebarInset>
      </div>
      <ProgressDialog />
    </SidebarProvider>
  );
}
