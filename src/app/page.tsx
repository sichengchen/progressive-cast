"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PodcastSidebar } from "@/components/podcast-sidebar";
import { MainContent } from "@/components/main-content";
import { AudioPlayer } from "@/components/audio-player";
import { LoadingScreen } from "@/components/loading-screen";
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
    </SidebarProvider>
  );
}
