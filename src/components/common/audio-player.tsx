"use client"

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Rewind, FastForward, Volume2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CoverImage } from '@/components/ui/cover-image';
import { usePodcastStore } from '@/lib/store';
import { DownloadService } from '@/lib/download-service';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTime } from '@/lib/utils';

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  const {
    playbackState,
    preferences,
    podcasts,
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

  // Get current podcast info
  const currentPodcast = currentEpisode ? podcasts.find(p => p.id === currentEpisode.podcastId) : null;

  const handleSkip = useCallback((seconds: number) => {
    if (!audioRef.current) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;
    
    // Save progress after seeking
    if (currentEpisode && duration > 0) {
      saveProgress(currentEpisode.id, newTime, duration);
    }
  }, [duration, currentTime, setCurrentTime, currentEpisode, saveProgress]);

  // Update MediaSession metadata when episode changes
  const updateMediaSession = useCallback(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && currentEpisode && currentPodcast) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentEpisode.title,
        artist: currentPodcast.title,
        album: currentPodcast.author || currentPodcast.title,
        artwork: currentEpisode.imageUrl || currentPodcast.imageUrl ? [
          {
            src: currentEpisode.imageUrl || currentPodcast.imageUrl || '',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ] : undefined
      });

      // Set up action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        resumePlayback();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        pausePlayback();
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || preferences.skipInterval || 30;
        handleSkip(-skipTime);
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || preferences.skipInterval || 30;
        handleSkip(skipTime);
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          const newTime = Math.max(0, Math.min(duration, details.seekTime));
          setCurrentTime(newTime);
          audioRef.current.currentTime = newTime;
          
          // Save progress after seeking via MediaSession
          if (currentEpisode && duration > 0) {
            saveProgress(currentEpisode.id, newTime, duration);
          }
        }
      });
    }
  }, [currentEpisode, currentPodcast, resumePlayback, pausePlayback, handleSkip, preferences.skipInterval, setCurrentTime, duration, saveProgress]);

  // Update MediaSession playback state
  const updateMediaSessionState = useCallback(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Update MediaSession position state
  const updateMediaSessionPosition = useCallback(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1,
          position: Math.min(currentTime, duration) // Ensure position doesn't exceed duration
        });
      } catch (error) {
        // Some browsers may not support setPositionState or have issues with it
        console.warn('Failed to update MediaSession position:', error);
      }
    }
  }, [currentTime, duration]);

  // Update MediaSession metadata when episode changes
  useEffect(() => {
    updateMediaSession();
  }, [updateMediaSession]);

  // Update MediaSession playback state when play/pause changes
  useEffect(() => {
    updateMediaSessionState();
  }, [updateMediaSessionState]);

  // Update MediaSession position periodically (less frequently than every second)
  useEffect(() => {
    if (!currentEpisode || duration <= 0) return;
    
    const interval = setInterval(() => {
      updateMediaSessionPosition();
    }, 5000); // Update position every 5 seconds instead of every second

    // Also update immediately
    updateMediaSessionPosition();

    return () => clearInterval(interval);
  }, [currentEpisode, duration, updateMediaSessionPosition]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!audioRef.current || !currentEpisode) return;

    const audio = audioRef.current;

    // Pause and reset current audio before loading new source
    audio.pause();
    audio.currentTime = 0;

    const loadAudioSource = async () => {
      let audioUrl = currentEpisode.audioUrl;
      
      // Try to get local audio file first if episode is downloaded
      if (currentEpisode.isDownloaded) {
        try {
          const localUrl = await DownloadService.getLocalAudioUrl(currentEpisode);
          if (localUrl) {
            audioUrl = localUrl;
            console.log('Using local audio file for offline playback');
          } else {
            console.log('Local file missing, falling back to streaming');
          }
        } catch (error) {
          console.warn('Failed to load local audio file, falling back to streaming:', error);
        }
      }
      
      // Set the audio source
      audio.src = audioUrl;
      audio.load();
    };

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
      // Auto-play if user intended to play this episode
      if (isPlaying && audio.paused) {
        // Add a small delay for downloaded files to ensure blob URL is ready
        const playAudio = () => {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn('Auto-play failed:', error);
              pausePlayback();
            });
          }
        };
        
        // For blob URLs (downloaded files), add a small delay
        if (audio.src.startsWith('blob:')) {
          setTimeout(playAudio, 100);
        } else {
          playAudio();
        }
      }
    };

    const handleEnded = () => {
      pausePlayback();
      // Save final progress
      saveProgress(currentEpisode.id, duration, duration);
      
      // Clean up blob URL if it was created for local playback
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
    };

    const handleError = (e: Event) => {
      console.warn('Audio error:', e);
      setLoading(false);
      
      // If this was a local file and it failed, try to fallback to streaming
      if (audio.src.startsWith('blob:') && currentEpisode.isDownloaded) {
        console.log('Local playback failed, attempting to fallback to streaming');
        URL.revokeObjectURL(audio.src);
        audio.src = currentEpisode.audioUrl;
        audio.load();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Load the audio source (local or remote)
    loadAudioSource();

    return () => {
      // Clean up: pause audio and remove event listeners
      audio.pause();
      
      // Clean up blob URL if it was created
      if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
      
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentEpisode, setDuration, setLoading, pausePlayback, saveProgress, setCurrentTime, duration, isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      // Only try to play if audio is ready and not already playing
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && audio.paused) {
        const attemptPlay = () => {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn('Play request failed:', error);
              // If play fails due to user interaction policy, just pause
              pausePlayback();
            });
          }
        };

        // For blob URLs (downloaded files), ensure a small delay
        if (audio.src.startsWith('blob:')) {
          setTimeout(attemptPlay, 50);
        } else {
          attemptPlay();
        }
      }
      // If audio is not ready, the canplay handler in the episode loading effect will handle it
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
      // Get current values directly from audio element to avoid dependency issues
      if (audioRef.current && currentEpisode) {
        const currentAudioTime = audioRef.current.currentTime;
        const currentAudioDuration = audioRef.current.duration || duration;
        if (currentAudioDuration > 0) {
          saveProgress(currentEpisode.id, currentAudioTime, currentAudioDuration);
        }
      }
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [currentEpisode, isPlaying, saveProgress, duration]);

  const handlePlayPause = () => {
    if (isPlaying) {
      // Save progress when pausing
      if (currentEpisode && audioRef.current) {
        const currentAudioTime = audioRef.current.currentTime;
        const currentAudioDuration = audioRef.current.duration || duration;
        if (currentAudioDuration > 0) {
          saveProgress(currentEpisode.id, currentAudioTime, currentAudioDuration);
        }
      }
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
    
    // Save progress after seeking via progress bar
    if (currentEpisode && duration > 0) {
      saveProgress(currentEpisode.id, newTime, duration);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
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