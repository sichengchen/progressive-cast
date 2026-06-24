"use client";

import { useEffect } from "react";
import { usePodcastStore } from "@/lib/store";
import { initializeSync } from "@/lib/sync/bridge";

export function AppInitializer() {
  const initializeStore = usePodcastStore((state) => state.initializeStore);

  useEffect(() => {
    void (async () => {
      await initializeStore();
      await initializeSync();
    })();
  }, [initializeStore]);

  return null; // This component doesn't render anything
}
