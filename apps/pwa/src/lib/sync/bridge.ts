import {
  createSyncLocatorKey,
  type BootstrapSyncRequest,
  type CurrentPlaybackSyncRecord,
  type PlaybackRealtimeEvent,
  type PlaybackCheckpointSyncRecord,
  type SyncPreferences,
  type SyncStateResponse,
} from "@pgcast/contracts";

import { DatabaseService } from "@/lib/database";
import { usePodcastStore } from "@/lib/store";
import type { Episode, PlaybackProgress, Podcast } from "@/lib/types";
import { RSSService } from "@/lib/rss-service";

import { createSyncClient, validateBackendUrl } from "./client";
import { flushSyncOutbox } from "./queue";
import { hasSyncBackendConfigured, useSyncBackendStore } from "./store";

let realtimeSocket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let reconnectEnabled = false;

export async function initializeSync(): Promise<void> {
  if (!hasSyncBackendConfigured()) {
    return;
  }

  try {
    await syncNow();
  } catch (error) {
    console.error("Failed to initialize sync backend", error);
  }
}

export async function connectSyncBackend(backendUrl: string, apiToken: string): Promise<void> {
  const normalizedUrl = validateBackendUrl(backendUrl);
  const trimmedToken = apiToken.trim();

  if (!trimmedToken) {
    throw new Error("Personal token is required.");
  }

  useSyncBackendStore.setState({
    connectionStatus: "connecting",
    error: null,
  });

  const client = createSyncClient({
    apiToken: trimmedToken,
    backendUrl: normalizedUrl,
  });
  const meta = await client.getMeta();
  await client.getState();

  useSyncBackendStore.getState().setCredentials(normalizedUrl, trimmedToken);
  useSyncBackendStore.getState().setValidated(meta, new Date().toISOString());

  await syncNow({ forceBootstrap: true });
}

export function disconnectSyncBackend(): void {
  stopRealtimeConnection();
  useSyncBackendStore.getState().clearConfiguration();
}

export async function syncNow(options: { forceBootstrap?: boolean } = {}): Promise<void> {
  if (!hasSyncBackendConfigured()) {
    return;
  }

  const state = useSyncBackendStore.getState();
  const client = createSyncClient({
    apiToken: state.apiToken,
    backendUrl: state.backendUrl,
  });

  useSyncBackendStore.setState({
    connectionStatus: "syncing",
    error: null,
  });

  try {
    const meta = await client.getMeta();
    useSyncBackendStore.getState().setValidated(meta, new Date().toISOString());

    let remoteState: SyncStateResponse;

    if (options.forceBootstrap || !state.initialSyncCompleted) {
      remoteState = await client.bootstrap(await createBootstrapSnapshot());
    } else {
      await flushSyncOutbox();
      remoteState = await client.getState();
    }

    await applyRemoteState(remoteState);
    useSyncBackendStore.setState({
      connectionStatus: "connected",
      error: null,
      initialSyncCompleted: true,
    });
    await ensureRealtimeConnection();
  } catch (error) {
    stopRealtimeConnection();
    useSyncBackendStore.setState({
      connectionStatus: "error",
      error: error instanceof Error ? error.message : "Failed to sync the personal backend.",
    });
    throw error;
  }
}

async function createBootstrapSnapshot(): Promise<BootstrapSyncRequest> {
  const localData = await DatabaseService.exportData();
  const { deviceId } = useSyncBackendStore.getState();
  const podcastStore = usePodcastStore.getState();
  const podcastsById = new Map(localData.podcasts.map((podcast) => [podcast.id, podcast]));
  const episodesById = new Map(localData.episodes.map((episode) => [episode.id, episode]));

  const subscriptions = localData.podcasts.map((podcast) => ({
    deletedAt: null,
    feedUrl: podcast.feedUrl,
    status: "active" as const,
    subscribedAt: podcast.subscriptionDate.toISOString(),
    updatedAt: podcast.subscriptionDate.toISOString(),
  }));

  const playbackHistory = localData.playbackProgress
    .map((progress) => {
      const episode = episodesById.get(progress.episodeId);
      const podcast = podcastsById.get(progress.podcastId);
      if (!episode || !podcast) {
        return null;
      }

      return progressToSyncRecord(progress, episode, podcast);
    })
    .filter((record): record is PlaybackCheckpointSyncRecord => record !== null);

  const currentPlayback = createCurrentPlaybackSnapshot(
    podcastStore.playbackState.currentEpisode,
    podcastStore.playbackState.currentTime,
    podcastStore.playbackState.duration,
    podcastStore.podcasts,
    deviceId,
  );

  return {
    currentPlayback,
    deviceId,
    playbackHistory,
    preferences: {
      autoPlay: podcastStore.preferences.autoPlay,
      itunesSearchEnabled: podcastStore.preferences.itunesSearchEnabled,
      skipInterval: podcastStore.preferences.skipInterval,
      updatedAt: new Date().toISOString(),
      whatsNewCount: podcastStore.preferences.whatsNewCount,
    },
    subscriptions,
  };
}

async function applyRemoteState(state: SyncStateResponse): Promise<void> {
  await applySubscriptions(state.subscriptions);
  await applyPlaybackState(state.playbackHistory, state.currentPlayback);
  await refreshPodcastStoreState(state.preferences);
}

async function applySubscriptions(
  subscriptions: SyncStateResponse["subscriptions"],
): Promise<void> {
  const activeFeedUrls = new Set(
    subscriptions.filter((record) => record.status === "active").map((record) => record.feedUrl),
  );
  const localPodcasts = await DatabaseService.getPodcasts();

  for (const podcast of localPodcasts) {
    if (!activeFeedUrls.has(podcast.feedUrl)) {
      await DatabaseService.deletePodcast(podcast.id);
    }
  }

  const existingFeedUrls = new Set(
    (await DatabaseService.getPodcasts()).map((podcast) => podcast.feedUrl),
  );
  for (const feedUrl of activeFeedUrls) {
    if (existingFeedUrls.has(feedUrl)) {
      continue;
    }

    const feed = await RSSService.parseFeed(feedUrl);
    const { podcast, episodes } = RSSService.mapFeedToPodcast(feed);
    await DatabaseService.addPodcast(podcast);
    await DatabaseService.addEpisodes(episodes);
  }
}

async function applyPlaybackState(
  playbackHistory: PlaybackCheckpointSyncRecord[],
  currentPlayback: CurrentPlaybackSyncRecord | null,
): Promise<void> {
  await DatabaseService.clearPlaybackProgress();

  const mergedRecords = new Map<string, PlaybackCheckpointSyncRecord>();
  for (const checkpoint of playbackHistory) {
    mergedRecords.set(createSyncLocatorKey(checkpoint.locator), checkpoint);
  }

  if (currentPlayback) {
    mergedRecords.set(createSyncLocatorKey(currentPlayback.locator), {
      currentTime: currentPlayback.currentTime,
      duration: currentPlayback.duration,
      isCompleted: false,
      lastPlayedAt: currentPlayback.updatedAt,
      locator: currentPlayback.locator,
      updatedAt: currentPlayback.updatedAt,
    });
  }

  for (const record of mergedRecords.values()) {
    const resolvedEpisode = await resolveEpisodeForLocator(record.locator);
    if (!resolvedEpisode) {
      continue;
    }

    const progress: PlaybackProgress = {
      currentTime: record.currentTime,
      duration: record.duration,
      episodeId: resolvedEpisode.episode.id,
      id: `${resolvedEpisode.episode.id}_progress`,
      isCompleted: record.isCompleted,
      lastPlayedAt: new Date(record.lastPlayedAt),
      podcastId: resolvedEpisode.podcast.id,
    };

    await DatabaseService.savePlaybackProgress(progress);
  }
}

async function resolveEpisodeForLocator(locator: PlaybackCheckpointSyncRecord["locator"]) {
  const podcasts = await DatabaseService.getPodcasts();
  const podcast = podcasts.find((candidate) => candidate.feedUrl === locator.feedUrl);
  if (!podcast) {
    return null;
  }

  let episodes = await DatabaseService.getEpisodesByPodcastId(podcast.id);
  let episode = findEpisodeByLocator(episodes, locator);

  if (!episode) {
    try {
      const feed = await RSSService.parseFeed(locator.feedUrl);
      const incomingEpisodes = RSSService.rssEpisodesToEpisodes(feed.episodes, podcast.id);
      try {
        await DatabaseService.addEpisodes(incomingEpisodes);
      } catch {
        // Keep existing local metadata when duplicate IDs already exist.
      }
      episodes = await DatabaseService.getEpisodesByPodcastId(podcast.id);
      episode = findEpisodeByLocator(episodes, locator);
    } catch (error) {
      console.warn(`Failed to refresh ${locator.feedUrl} while resolving a synced episode`, error);
    }
  }

  if (!episode) {
    return null;
  }

  return { episode, podcast };
}

function findEpisodeByLocator(
  episodes: Episode[],
  locator: PlaybackCheckpointSyncRecord["locator"],
): Episode | undefined {
  return episodes.find(
    (episode) =>
      (locator.episodeGuid && episode.guid === locator.episodeGuid) ||
      episode.audioUrl === locator.audioUrl,
  );
}

function createCurrentPlaybackSnapshot(
  currentEpisode: Episode | null,
  currentTime: number,
  duration: number,
  podcasts: Podcast[],
  deviceId: string,
): CurrentPlaybackSyncRecord | null {
  if (!currentEpisode) {
    return null;
  }

  const podcast = podcasts.find((candidate) => candidate.id === currentEpisode.podcastId);
  if (!podcast) {
    return null;
  }

  return {
    currentTime,
    duration,
    locator: {
      audioUrl: currentEpisode.audioUrl,
      episodeGuid: currentEpisode.guid,
      feedUrl: podcast.feedUrl,
    },
    sourceDeviceId: deviceId,
    updatedAt: new Date().toISOString(),
  };
}

function progressToSyncRecord(
  progress: PlaybackProgress,
  episode: Episode,
  podcast: Podcast,
): PlaybackCheckpointSyncRecord {
  return {
    currentTime: progress.currentTime,
    duration: progress.duration,
    isCompleted: progress.isCompleted,
    lastPlayedAt: progress.lastPlayedAt.toISOString(),
    locator: {
      audioUrl: episode.audioUrl,
      episodeGuid: episode.guid,
      feedUrl: podcast.feedUrl,
    },
    updatedAt: progress.lastPlayedAt.toISOString(),
  };
}

async function refreshPodcastStoreState(remotePreferences?: SyncPreferences): Promise<void> {
  const [podcasts, playbackHistory] = await Promise.all([
    DatabaseService.getPodcasts(),
    DatabaseService.exportData().then((data) => data.playbackProgress),
  ]);

  const progressMap = new Map<string, PlaybackProgress>();
  playbackHistory.forEach((progress) => {
    progressMap.set(progress.episodeId, progress);
  });

  const currentStore = usePodcastStore.getState();
  const selectedPodcastId = podcasts.some(
    (podcast) => podcast.id === currentStore.selectedPodcastId,
  )
    ? currentStore.selectedPodcastId
    : null;
  const episodes = selectedPodcastId
    ? await DatabaseService.getEpisodesByPodcastId(selectedPodcastId)
    : [];
  const currentEpisodeStillExists = currentStore.playbackState.currentEpisode
    ? await DatabaseService.getEpisodeById(currentStore.playbackState.currentEpisode.id)
    : null;

  usePodcastStore.setState((state) => ({
    episodes,
    playbackProgress: progressMap,
    playbackState: currentEpisodeStillExists
      ? state.playbackState
      : {
          ...state.playbackState,
          currentEpisode: null,
          currentTime: 0,
          duration: 0,
          isLoading: false,
          isPlaying: false,
          seekRequested: false,
          showNotes: "",
        },
    podcasts,
    preferences: remotePreferences
      ? {
          ...state.preferences,
          autoPlay: remotePreferences.autoPlay,
          itunesSearchEnabled: remotePreferences.itunesSearchEnabled,
          skipInterval: remotePreferences.skipInterval,
          whatsNewCount: remotePreferences.whatsNewCount,
        }
      : state.preferences,
    selectedPodcastId,
  }));
}

async function ensureRealtimeConnection(): Promise<void> {
  if (!hasSyncBackendConfigured()) {
    return;
  }

  if (
    realtimeSocket &&
    (realtimeSocket.readyState === WebSocket.CONNECTING ||
      realtimeSocket.readyState === WebSocket.OPEN)
  ) {
    return;
  }

  const state = useSyncBackendStore.getState();
  const client = createSyncClient({
    apiToken: state.apiToken,
    backendUrl: state.backendUrl,
  });

  reconnectEnabled = true;
  const ticket = await client.createRealtimeTicket({ deviceId: state.deviceId });
  const socket = new WebSocket(ticket.wsUrl);
  realtimeSocket = socket;

  socket.addEventListener("open", () => {
    useSyncBackendStore.setState({
      connectionStatus: "connected",
      error: null,
    });
  });

  socket.addEventListener("message", (event) => {
    void handleRealtimeMessage(event.data);
  });

  socket.addEventListener("close", () => {
    if (realtimeSocket === socket) {
      realtimeSocket = null;
    }

    if (reconnectEnabled) {
      scheduleRealtimeReconnect();
    }
  });

  socket.addEventListener("error", () => {
    useSyncBackendStore.setState({
      connectionStatus: "error",
      error: "Realtime playback updates disconnected.",
    });
  });
}

function stopRealtimeConnection(): void {
  reconnectEnabled = false;

  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (realtimeSocket) {
    realtimeSocket.close();
    realtimeSocket = null;
  }
}

function scheduleRealtimeReconnect(): void {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
  }

  reconnectTimer = window.setTimeout(() => {
    void syncNow();
  }, 3_000);
}

async function handleRealtimeMessage(data: unknown): Promise<void> {
  if (typeof data !== "string") {
    return;
  }

  let event: PlaybackRealtimeEvent;
  try {
    event = JSON.parse(data) as PlaybackRealtimeEvent;
  } catch {
    return;
  }

  const { deviceId } = useSyncBackendStore.getState();
  if (event.currentPlayback?.sourceDeviceId === deviceId) {
    return;
  }

  if (!event.checkpoint) {
    return;
  }

  const resolved = await resolveEpisodeForLocator(event.checkpoint.locator);
  if (!resolved) {
    return;
  }

  await DatabaseService.savePlaybackProgress({
    currentTime: event.checkpoint.currentTime,
    duration: event.checkpoint.duration,
    episodeId: resolved.episode.id,
    id: `${resolved.episode.id}_progress`,
    isCompleted: event.checkpoint.isCompleted,
    lastPlayedAt: new Date(event.checkpoint.lastPlayedAt),
    podcastId: resolved.podcast.id,
  });

  await refreshPodcastStoreState();
}
