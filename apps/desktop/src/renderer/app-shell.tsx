import { Outlet } from "@tanstack/react-router";

import { AppLayout } from "@/components/common/app-layout";
import { AudioPlayer } from "@/components/common/audio-player";
import { PlayerSidePanel } from "@/components/common/player-side-panel";
import { ProgressDialog } from "@/components/common/progress-dialog";
import { PodcastSidebar } from "@/components/common/sidebar";

export function AppShell() {
  return (
    <>
      <AppLayout
        sidebar={<PodcastSidebar />}
        mainContent={<Outlet />}
        rightPanel={<PlayerSidePanel />}
        controlBar={<AudioPlayer />}
      />
      <ProgressDialog />
    </>
  );
}
