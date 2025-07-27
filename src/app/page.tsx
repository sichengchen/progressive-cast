"use client"

import { PodcastSidebar } from "@/components/common/sidebar";
import { MainContent } from "@/components/pages";
import { AudioPlayer } from "@/components/common/audio-player";
import { ShowNotes } from "@/components/common/show-notes";
import { AppLayout } from "@/components/common/app-layout";
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
    <>
      <AppLayout
        sidebar={<PodcastSidebar />}
        mainContent={<MainContent />}
        rightPanel={<ShowNotes />}
        controlBar={<AudioPlayer />}
      />
      <ProgressDialog />
    </>
  );
}
