import { useEffect, useRef, useState } from "react";

import type { DesktopSettings, EpisodeSummary, PodcastSummary } from "../shared/types";
import { desktopApi } from "./desktop-api";

export function AppShell() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [podcasts, setPodcasts] = useState<PodcastSummary[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeSummary | null>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [settings, setSettings] = useState<DesktopSettings>({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    void reloadLibrary().catch(reportError);
    void desktopApi.settings.get().then(setSettings).catch(reportError);
  }, []);

  useEffect(() => {
    if (!selectedPodcastId) {
      setEpisodes([]);
      return;
    }

    void desktopApi.episodes.listByPodcast(selectedPodcastId).then(setEpisodes).catch(reportError);
  }, [selectedPodcastId]);

  function reportError(error: unknown) {
    setStatus(error instanceof Error ? error.message : "Something went wrong.");
  }

  async function runWithStatus(message: string, action: () => Promise<void>) {
    setStatus(message);
    try {
      await action();
      setStatus("");
    } catch (error) {
      reportError(error);
    }
  }

  async function reloadLibrary() {
    const nextPodcasts = await desktopApi.library.list();
    setPodcasts(nextPodcasts);
    setSelectedPodcastId((current) => current ?? nextPodcasts[0]?.id ?? null);
  }

  async function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runWithStatus("Adding feed...", async () => {
      const podcast = await desktopApi.library.subscribe(feedUrl);
      setFeedUrl("");
      await reloadLibrary();
      setSelectedPodcastId(podcast.id);
    });
  }

  async function handlePlay(episode: EpisodeSummary) {
    await runWithStatus("Loading episode...", async () => {
      const source = await desktopApi.playback.getSource(episode.id);
      setCurrentEpisode(episode);
      if (audioRef.current) {
        audioRef.current.src = source.source;
        await audioRef.current.play();
      }
    });
  }

  async function saveProgress(isCompleted = false) {
    const audio = audioRef.current;
    if (!audio || !currentEpisode) {
      return;
    }

    await desktopApi.playback.saveProgress({
      currentTime: audio.currentTime,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      episodeId: currentEpisode.id,
      isCompleted,
      podcastId: currentEpisode.podcastId,
    });
  }

  async function handleDownload(episodeId: string) {
    await runWithStatus("Downloading...", async () => {
      await desktopApi.downloads.start(episodeId);
      if (selectedPodcastId) {
        setEpisodes(await desktopApi.episodes.listByPodcast(selectedPodcastId));
      }
    });
  }

  async function handleDeleteDownload(episodeId: string) {
    await runWithStatus("Deleting download...", async () => {
      await desktopApi.downloads.delete(episodeId);
      if (selectedPodcastId) {
        setEpisodes(await desktopApi.episodes.listByPodcast(selectedPodcastId));
      }
    });
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runWithStatus("Saving settings...", async () => {
      setSettings(await desktopApi.settings.set(settings));
    });
  }

  async function handleSync() {
    await runWithStatus("Syncing...", async () => {
      await desktopApi.sync.now();
      await reloadLibrary();
      if (selectedPodcastId) {
        setEpisodes(await desktopApi.episodes.listByPodcast(selectedPodcastId));
      }
    });
  }

  async function handleRefresh() {
    if (!selectedPodcastId) {
      return;
    }

    await runWithStatus("Refreshing...", async () => {
      await desktopApi.library.refresh(selectedPodcastId);
      await reloadLibrary();
      setEpisodes(await desktopApi.episodes.listByPodcast(selectedPodcastId));
    });
  }

  async function handleUnsubscribe() {
    if (!selectedPodcastId) {
      return;
    }

    await runWithStatus("Removing...", async () => {
      await desktopApi.library.unsubscribe(selectedPodcastId);
      const nextPodcasts = await desktopApi.library.list();
      setPodcasts(nextPodcasts);
      setSelectedPodcastId(nextPodcasts[0]?.id ?? null);
    });
  }

  const selectedPodcast = podcasts.find((podcast) => podcast.id === selectedPodcastId) ?? null;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <header>
          <p className="eyebrow">Desktop</p>
          <h1>Newcastle</h1>
        </header>

        <form className="feed-form" onSubmit={handleSubscribe}>
          <label htmlFor="feed-url">Feed URL</label>
          <div>
            <input
              id="feed-url"
              required
              type="url"
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
            />
            <button type="submit">Add</button>
          </div>
        </form>

        <nav aria-label="Podcasts">
          {podcasts.map((podcast) => (
            <button
              aria-current={podcast.id === selectedPodcastId ? "page" : undefined}
              key={podcast.id}
              type="button"
              onClick={() => setSelectedPodcastId(podcast.id)}
            >
              {podcast.title}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <div className="content-header">
          <div>
            <p className="eyebrow">Library</p>
            <h2>{selectedPodcast?.title ?? "Subscriptions"}</h2>
          </div>
          <div className="content-actions">
            <button type="button" onClick={handleSync}>
              Sync
            </button>
            <button disabled={!selectedPodcastId} type="button" onClick={handleRefresh}>
              Refresh
            </button>
            <button disabled={!selectedPodcastId} type="button" onClick={handleUnsubscribe}>
              Unsubscribe
            </button>
          </div>
        </div>

        <div className="workspace">
          <section className="episode-panel">
            {episodes.length === 0 ? (
              <div className="empty-state">
                <h3>No episodes</h3>
              </div>
            ) : (
              <ul className="episode-list">
                {episodes.map((episode) => (
                  <li key={episode.id}>
                    <div>
                      <h3>{episode.title}</h3>
                      <p>{episode.description}</p>
                    </div>
                    <div className="episode-actions">
                      <button type="button" onClick={() => void handlePlay(episode)}>
                        Play
                      </button>
                      {episode.downloadedPath ? (
                        <button type="button" onClick={() => void handleDeleteDownload(episode.id)}>
                          Delete
                        </button>
                      ) : (
                        <button type="button" onClick={() => void handleDownload(episode.id)}>
                          Download
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="settings-panel">
            <form onSubmit={handleSaveSettings}>
              <label htmlFor="sync-base-url">Sync Endpoint</label>
              <input
                id="sync-base-url"
                type="url"
                value={settings.syncBaseUrl ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    syncBaseUrl: event.target.value,
                  }))
                }
              />

              <label htmlFor="sync-auth-token">Token</label>
              <input
                id="sync-auth-token"
                type="password"
                value={settings.syncAuthToken ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    syncAuthToken: event.target.value,
                  }))
                }
              />

              <button type="submit">Save</button>
            </form>
          </aside>
        </div>

        <footer className="player-bar">
          <div>
            <p className="eyebrow">Now Playing</p>
            <strong>{currentEpisode?.title ?? "Nothing selected"}</strong>
          </div>
          <audio ref={audioRef} controls onEnded={() => void saveProgress(true)} onPause={() => void saveProgress()} />
          <span>{status}</span>
        </footer>
      </section>
    </main>
  );
}
