"use client"

import { useEffect } from 'react';
import { usePodcastStore } from '@/lib/store';

export function KeyboardShortcuts() {
  const { 
    playbackState, 
    pausePlayback, 
    resumePlayback, 
    setCurrentTime,
    preferences 
  } = usePodcastStore();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (playbackState.isPlaying) {
            pausePlayback();
          } else {
            resumePlayback();
          }
          break;
        
        case 'ArrowLeft':
          event.preventDefault();
          const newTimeLeft = Math.max(0, playbackState.currentTime - preferences.skipInterval);
          setCurrentTime(newTimeLeft);
          break;
        
        case 'ArrowRight':
          event.preventDefault();
          const newTimeRight = Math.min(playbackState.duration, playbackState.currentTime + preferences.skipInterval);
          setCurrentTime(newTimeRight);
          break;
        
        case 'KeyK':
          event.preventDefault();
          if (playbackState.isPlaying) {
            pausePlayback();
          } else {
            resumePlayback();
          }
          break;
        
        case 'KeyJ':
          event.preventDefault();
          const newTimeJ = Math.max(0, playbackState.currentTime - 10);
          setCurrentTime(newTimeJ);
          break;
        
        case 'KeyL':
          event.preventDefault();
          const newTimeL = Math.min(playbackState.duration, playbackState.currentTime + 10);
          setCurrentTime(newTimeL);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [playbackState, pausePlayback, resumePlayback, setCurrentTime, preferences.skipInterval]);

  return null; // This component doesn't render anything
} 