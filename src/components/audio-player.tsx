"use client"

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Rewind, FastForward, Volume2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CoverImage } from '@/components/ui/cover-image';
import { usePodcastStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTime } from '@/lib/utils';

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  const {
    playbackState,
    preferences,
    pausePlayback,
    resumePlayback,
    setCurrentTime,
    setDuration,
    setVolume,
    setLoading,
    saveProgress,
    clearSeekRequest,
    toggleShowNotes,
    showNotesOpen,
    setSelectedPodcast,
    setCurrentPage
  } = usePodcastStore();

  const { currentEpisode, isPlaying, currentTime, duration, volume, seekRequested } = playbackState;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!audioRef.current || !currentEpisode) return;

    const audio = audioRef.current;

    // Pause and reset current audio before loading new source
    audio.pause();
    audio.currentTime = 0;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Restore saved playback position if available
      const { playbackProgress } = usePodcastStore.getState();
      const savedProgress = currentEpisode ? playbackProgress.get(currentEpisode.id) : null;
      const savedTime = savedProgress?.currentTime || 0;

      if (savedTime > 0 && savedTime < audio.duration) {
        audio.currentTime = savedTime;
        setCurrentTime(savedTime);
      } else {
        setCurrentTime(0);
      }
      setLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadStart = () => {
      setLoading(true);
    };

    const handleCanPlay = () => {
      setLoading(false);
    };

    const handleEnded = () => {
      pausePlayback();
      // Save final progress
      saveProgress(currentEpisode.id, duration, duration);
    };

    const handleError = (e: Event) => {
      console.warn('Audio error:', e);
      setLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Load the audio source
    audio.src = currentEpisode.audioUrl;
    audio.load();

    return () => {
      // Clean up: pause audio and remove event listeners
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentEpisode, setDuration, setLoading, pausePlayback, saveProgress, setCurrentTime, duration]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      // Only try to play if audio is ready
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn('Play request failed:', error);
            // If play fails due to user interaction policy, just pause
            pausePlayback();
          });
        }
      } else {
        // Wait for audio to be ready before playing
        const handleCanPlay = () => {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn('Play request failed:', error);
              pausePlayback();
            });
          }
          audio.removeEventListener('canplay', handleCanPlay);
        };
        audio.addEventListener('canplay', handleCanPlay);
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, pausePlayback]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle seek requests from show notes timestamps
  useEffect(() => {
    if (seekRequested && audioRef.current) {
      audioRef.current.currentTime = currentTime;
      clearSeekRequest();
    }
  }, [seekRequested, currentTime, clearSeekRequest]);

  // Save progress periodically
  useEffect(() => {
    if (!currentEpisode || !isPlaying) return;

    const interval = setInterval(() => {
      saveProgress(currentEpisode.id, currentTime, duration);
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [currentEpisode, isPlaying, currentTime, duration, saveProgress]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  const handleProgressChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;
  };

  const handleCoverClick = () => {
    if (currentEpisode?.podcastId) {
      setSelectedPodcast(currentEpisode.podcastId);
      setCurrentPage('podcasts');
    }
  };

  if (!mounted || !currentEpisode) {
    return null;
  }

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <audio ref={audioRef} />

      <div className="flex items-center gap-4 p-4">
        {/* Left side: Episode image */}
        <button 
          onClick={handleCoverClick}
          className="flex-shrink-0 transition-transform hover:scale-105 focus:outline-none rounded-lg"
          title="Jump to podcast details"
        >
          <CoverImage
            src={currentEpisode.imageUrl}
            alt={currentEpisode.title}
            size="md"
          />
        </button>

        {/* Mobile: Flexible space */}
        {isMobile && <div className="flex-1" />}

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSkip(-preferences.skipInterval)}
          >
            <Rewind className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={handlePlayPause}
            disabled={playbackState.isLoading}
          >
            {playbackState.isLoading ? (
              <div className="h-4 w-4 animate-spin">
                <div className="h-full w-full border-2 border-current border-t-transparent rounded-full" />
              </div>
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSkip(preferences.skipInterval)}
          >
            <FastForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Title and Progress (vertical layout) */}
        {!isMobile && (
          <div className="flex-1 min-w-0 text-center">
            {/* Title */}
            <h4 className="font-medium text-sm truncate mb-2">
              {currentEpisode.title}
            </h4>

            {/* Progress bar */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground w-12 text-right">
                {formatTime(currentTime)}
              </span>

              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleProgressChange}
                className="flex-1 max-w-md"
              />

              <span className="text-xs text-muted-foreground w-12">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        {/* Mobile: Flexible space */}
        {isMobile && <div className="flex-1" />}

        {/* Volume Controls */}
        {!isMobile && (
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>
        )}

        {/* Show Notes Toggle Button */}
        <Button
          size="sm"
          variant={showNotesOpen ? "default" : "ghost"}
          onClick={toggleShowNotes}
          className={showNotesOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground"}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 