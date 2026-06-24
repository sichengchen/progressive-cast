import { Outlet } from "@tanstack/react-router";

import { AppLayout } from "@/components/common/app-layout";
import { AudioPlayer } from "@/components/common/audio-player";
import { ProgressDialog } from "@/components/common/progress-dialog";
import { ShowNotes } from "@/components/common/show-notes";
import { PodcastSidebar } from "@/components/common/sidebar";

export function AppShell() {
  return (
    <>
      <AppLayout
        sidebar={<PodcastSidebar />}
        mainContent={<Outlet />}
        rightPanel={<ShowNotes />}
        controlBar={<AudioPlayer />}
      />
      <ProgressDialog />
    </>
  );
}
