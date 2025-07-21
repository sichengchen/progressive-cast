"use client"

import { useEffect } from 'react';
import { usePodcastStore } from '@/lib/store';

export function AppInitializer() {
  const initializeStore = usePodcastStore(state => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return null; // This component doesn't render anything
} 