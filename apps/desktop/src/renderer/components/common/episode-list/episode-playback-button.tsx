"use client";

import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePodcastStore } from "@/lib/store";
import type { Episode, PlaybackProgress } from "@/lib/types";
import { formatTime } from "@/lib/utils";

interface EpisodePlaybackButtonProps {
  episode: Episode;
  onPlay: (episode: Episode) => void;
  progress?: PlaybackProgress;
}

export function EpisodePlaybackButton({ episode, onPlay, progress }: EpisodePlaybackButtonProps) {
  const isCurrentEpisode = usePodcastStore(
    (state) => state.playbackState.currentEpisode?.id === episode.id,
  );
  const isPlaying = usePodcastStore((state) =>
    state.playbackState.currentEpisode?.id === episode.id ? state.playbackState.isPlaying : false,
  );
  const currentTime = usePodcastStore((state) =>
    state.playbackState.currentEpisode?.id === episode.id ? state.playbackState.currentTime : 0,
  );
  const currentDuration = usePodcastStore((state) =>
    state.playbackState.currentEpisode?.id === episode.id ? state.playbackState.duration : 0,
  );
  const pausePlayback = usePodcastStore((state) => state.pausePlayback);
  const resumePlayback = usePodcastStore((state) => state.resumePlayback);

  const duration =
    (isCurrentEpisode ? currentDuration : 0) || progress?.duration || episode.duration || 0;
  const position = isCurrentEpisode ? currentTime : progress?.currentTime || 0;
  const timeLabel = duration
    ? progress?.isCompleted
      ? formatTime(duration)
      : position > 0
        ? `${formatTime(Math.max(duration - position, 0))} remaining`
        : formatTime(duration)
    : null;
  const action = isCurrentEpisode && isPlaying ? "Pause" : "Play";

  const handleClick = () => {
    if (!isCurrentEpisode) {
      onPlay(episode);
      return;
    }

    if (isPlaying) {
      pausePlayback();
      return;
    }

    resumePlayback();
  };

  return (
    <Button
      aria-label={`${action} ${episode.title}${timeLabel ? `, ${timeLabel}` : ""}`}
      aria-pressed={isCurrentEpisode && isPlaying}
      className={timeLabel ? "h-7 gap-1.5 px-2.5 text-xs leading-none" : "size-7"}
      onClick={handleClick}
      size={timeLabel ? "sm" : "icon"}
      title={`${action} episode`}
      type="button"
      variant="outline"
    >
      {isCurrentEpisode && isPlaying ? (
        <Pause className="size-3.5" data-icon="inline-start" fill="currentColor" />
      ) : (
        <Play className="size-3.5" data-icon="inline-start" fill="currentColor" />
      )}
      {timeLabel ? <span className="tabular-nums leading-none">{timeLabel}</span> : null}
    </Button>
  );
}
