const favoriteEpisodesVersion = 1;
const favoriteEpisodesLimit = 500;

interface FavoriteEpisodesPayload {
  episodeIds: string[];
  version: number;
}

export function parseFavoriteEpisodes(value?: string): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Partial<FavoriteEpisodesPayload>;
    if (parsed.version !== favoriteEpisodesVersion || !Array.isArray(parsed.episodeIds)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed.episodeIds.filter(
          (episodeId): episodeId is string => typeof episodeId === "string" && episodeId.length > 0,
        ),
      ),
    ).slice(0, favoriteEpisodesLimit);
  } catch {
    return [];
  }
}

export function serializeFavoriteEpisodes(episodeIds: string[]): string {
  const payload: FavoriteEpisodesPayload = {
    episodeIds: Array.from(new Set(episodeIds.filter(Boolean))).slice(0, favoriteEpisodesLimit),
    version: favoriteEpisodesVersion,
  };

  return JSON.stringify(payload);
}

export function toggleFavoriteEpisodeId(episodeIds: string[], episodeId: string): string[] {
  if (episodeIds.includes(episodeId)) {
    return episodeIds.filter((favoriteId) => favoriteId !== episodeId);
  }

  return [episodeId, ...episodeIds].slice(0, favoriteEpisodesLimit);
}
