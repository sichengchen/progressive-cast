"use client";

import { PlaybackQueue } from "@/components/common/playback-queue";
import { ShowNotes } from "@/components/common/show-notes";
import { usePodcastStore } from "@/lib/store";

export function PlayerSidePanel() {
  const queueOpen = usePodcastStore((state) => state.queueOpen);

  return queueOpen ? <PlaybackQueue /> : <ShowNotes />;
}
