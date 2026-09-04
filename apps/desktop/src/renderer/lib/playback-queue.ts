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

export function mergePlaybackQueue(primaryIds: string[], fallbackIds: string[]): string[] {
  return Array.from(new Set([...primaryIds, ...fallbackIds].filter(Boolean))).slice(
    0,
    playbackQueueLimit,
  );
}

export function putEpisodeFirst(episodeIds: string[], episodeId: string): string[] {
  return [episodeId, ...episodeIds.filter((queuedId) => queuedId !== episodeId)].slice(
    0,
    playbackQueueLimit,
  );
}

export function putEpisodeNext(
  episodeIds: string[],
  episodeId: string,
  currentEpisodeId?: string,
): string[] {
  const withoutEpisode = episodeIds.filter((queuedId) => queuedId !== episodeId);
  const currentIndex = currentEpisodeId ? withoutEpisode.indexOf(currentEpisodeId) : -1;

  if (currentIndex < 0) {
    return putEpisodeFirst(withoutEpisode, episodeId);
  }

  return [
    ...withoutEpisode.slice(0, currentIndex + 1),
    episodeId,
    ...withoutEpisode.slice(currentIndex + 1),
  ].slice(0, playbackQueueLimit);
}
