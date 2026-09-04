const playbackQueueVersion = 1;
const playbackQueueLimit = 100;

interface PlaybackQueuePayload {
  episodeIds: string[];
  version: number;
}

export function parsePlaybackQueue(value?: string): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Partial<PlaybackQueuePayload>;
    if (parsed.version !== playbackQueueVersion || !Array.isArray(parsed.episodeIds)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed.episodeIds.filter(
          (episodeId): episodeId is string => typeof episodeId === "string" && episodeId.length > 0,
        ),
      ),
    ).slice(0, playbackQueueLimit);
  } catch {
    return [];
  }
}

export function serializePlaybackQueue(episodeIds: string[]): string {
  const payload: PlaybackQueuePayload = {
    episodeIds: Array.from(new Set(episodeIds.filter(Boolean))).slice(0, playbackQueueLimit),
    version: playbackQueueVersion,
  };

  return JSON.stringify(payload);
}

export function putEpisodeNext(episodeIds: string[], episodeId: string): string[] {
  return [episodeId, ...episodeIds.filter((queuedId) => queuedId !== episodeId)].slice(
    0,
    playbackQueueLimit,
  );
}
