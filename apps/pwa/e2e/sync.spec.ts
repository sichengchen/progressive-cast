import { expect, test } from "@playwright/test";

const BACKEND_URL = "http://127.0.0.1:9131";
const FEED_URL = "http://127.0.0.1:9131/feed.xml";
const AUDIO_URL = "http://127.0.0.1:9131/audio.mp3";
const TOKEN = "test-token";

test.beforeEach(async ({ request }) => {
  await request.post(`${BACKEND_URL}/__reset`);
});

test("syncs subscriptions, preferences, and playback progress across devices", async ({
  browser,
  request,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await openSettings(pageA);
  const seeded = await seedLocalDevice(pageA, { withProgress: true });
  expect(seeded.podcastTitle).toBe("Sync Test Podcast");

  await connectBackend(pageA);
  await expect
    .poll(() => readLocalSnapshot(pageA), {
      message: "device A should stay synced after bootstrap",
    })
    .toMatchObject({
      autoPlay: true,
      currentTime: 84,
      podcastTitle: "Sync Test Podcast",
      skipInterval: 45,
      whatsNewCount: 12,
    });

  await openSettings(pageB);
  await seedLocalDevice(pageB, { withProgress: false });
  await connectBackend(pageB);
  await expect
    .poll(() => readLocalSnapshot(pageB), {
      message: "device B should hydrate from the server snapshot",
    })
    .toMatchObject({
      autoPlay: true,
      currentTime: 84,
      feedUrl: FEED_URL,
      podcastTitle: "Sync Test Podcast",
      skipInterval: 45,
      whatsNewCount: 12,
    });

  await expect
    .poll(async () => {
      const response = await request.get(`${BACKEND_URL}/__stats`);
      const data = (await response.json()) as { wsConnections: number };
      return data.wsConnections;
    })
    .toBeGreaterThanOrEqual(2);

  await updatePlaybackProgress(pageA, 222);
  await expect
    .poll(() => readLocalSnapshot(pageB), {
      message: "device B should receive device A checkpoint updates",
    })
    .toMatchObject({
      currentTime: 222,
      episodeId: seeded.episodeId,
    });

  await contextA.close();
  await contextB.close();
});

async function connectBackend(page: import("@playwright/test").Page): Promise<void> {
  await openSettings(page);
  await page.getByPlaceholder("https://sync.example.com").fill(BACKEND_URL);
  await page.getByPlaceholder("Paste your personal token").fill(TOKEN);
  await page.getByRole("button", { name: "Connect" }).click();
  await expect
    .poll(() => readSyncStatus(page))
    .toMatchObject({
      connectionStatus: "connected",
      error: null,
      initialSyncCompleted: true,
    });
}

async function openSettings(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/settings", {
    waitUntil: "networkidle",
  });
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText("Sync Server", { exact: true }).first()).toBeVisible();
}

async function seedLocalDevice(
  page: import("@playwright/test").Page,
  options: { withProgress: boolean },
): Promise<{
  episodeId: string;
  podcastTitle: string;
}> {
  return page.evaluate(
    async ({ audioUrl, feedUrl, withProgress }) => {
      const [{ DatabaseService }, { usePodcastStore }] = await Promise.all([
        // @ts-ignore Vite serves source modules from /src during browser e2e runs.
        import("/src/lib/database.ts"),
        // @ts-ignore Vite serves source modules from /src during browser e2e runs.
        import("/src/lib/store.ts"),
      ]);

      await DatabaseService.clearAllData();
      const podcast = {
        author: "Test Author",
        categories: ["Technology"],
        description: "Podcast feed used for sync end-to-end tests.",
        feedUrl,
        id: "podcast-1",
        language: "en",
        lastUpdated: new Date("2026-04-18T10:00:00.000Z"),
        subscriptionDate: new Date("2026-04-18T10:00:00.000Z"),
        title: "Sync Test Podcast",
      };
      const episode = {
        audioUrl,
        description: "Episode description",
        guid: "episode-guid-1",
        id: "episode-1",
        podcastId: podcast.id,
        publishedAt: new Date("2026-04-18T09:00:00.000Z"),
        title: "Episode One",
      };

      await DatabaseService.addPodcast(podcast);
      await DatabaseService.addEpisodes([episode]);
      usePodcastStore.setState({
        podcasts: [podcast],
      });

      const store = usePodcastStore.getState();
      store.playEpisode(episode);
      store.setDuration(300);
      store.setSkipInterval(45);
      store.setAutoPlay(true);
      store.setWhatsNewCount(12);

      if (withProgress) {
        store.setCurrentTime(84);
        await store.saveProgress(episode.id, 84, 300);
      }

      return {
        episodeId: episode.id,
        podcastTitle: podcast.title,
      };
    },
    {
      audioUrl: AUDIO_URL,
      feedUrl: FEED_URL,
      withProgress: options.withProgress,
    },
  );
}

async function updatePlaybackProgress(
  page: import("@playwright/test").Page,
  currentTime: number,
): Promise<void> {
  await page.evaluate(
    async ({ currentTime }) => {
      const [{ DatabaseService }, { usePodcastStore }] = await Promise.all([
        // @ts-ignore Vite serves source modules from /src during browser e2e runs.
        import("/src/lib/database.ts"),
        // @ts-ignore Vite serves source modules from /src during browser e2e runs.
        import("/src/lib/store.ts"),
      ]);

      const podcast = (await DatabaseService.getPodcasts())[0];
      if (!podcast) {
        throw new Error("Missing podcast while updating playback");
      }

      const episode = (await DatabaseService.getEpisodesByPodcastId(podcast.id))[0];
      if (!episode) {
        throw new Error("Missing episode while updating playback");
      }

      const store = usePodcastStore.getState();
      store.playEpisode(episode);
      store.setDuration(300);
      store.setCurrentTime(currentTime);
      await store.saveProgress(episode.id, currentTime, 300);
    },
    { currentTime },
  );
}

async function readLocalSnapshot(page: import("@playwright/test").Page): Promise<{
  autoPlay: boolean;
  currentTime: number | null;
  episodeId: string | null;
  feedUrl: string | null;
  podcastTitle: string | null;
  skipInterval: number;
  whatsNewCount: number;
}> {
  return page.evaluate(async () => {
    const [{ DatabaseService }, { usePodcastStore }] = await Promise.all([
      // @ts-ignore Vite serves source modules from /src during browser e2e runs.
      import("/src/lib/database.ts"),
      // @ts-ignore Vite serves source modules from /src during browser e2e runs.
      import("/src/lib/store.ts"),
    ]);

    const podcast = (await DatabaseService.getPodcasts())[0] ?? null;
    const episode = podcast
      ? ((await DatabaseService.getEpisodesByPodcastId(podcast.id))[0] ?? null)
      : null;
    const progress = episode
      ? ((await DatabaseService.exportData()).playbackProgress.find(
          (entry: { episodeId: string }) => entry.episodeId === episode.id,
        ) ?? null)
      : null;
    const preferences = usePodcastStore.getState().preferences;

    return {
      autoPlay: preferences.autoPlay,
      currentTime: progress?.currentTime ?? null,
      episodeId: episode?.id ?? null,
      feedUrl: podcast?.feedUrl ?? null,
      podcastTitle: podcast?.title ?? null,
      skipInterval: preferences.skipInterval,
      whatsNewCount: preferences.whatsNewCount,
    };
  });
}

async function readSyncStatus(page: import("@playwright/test").Page): Promise<{
  connectionStatus: string;
  error: string | null;
  initialSyncCompleted: boolean;
}> {
  return page.evaluate(async () => {
    // @ts-ignore Vite serves source modules from /src during browser e2e runs.
    const { useSyncBackendStore } = await import("/src/lib/sync/store.ts");
    const state = useSyncBackendStore.getState();

    return {
      connectionStatus: state.connectionStatus,
      error: state.error,
      initialSyncCompleted: state.initialSyncCompleted,
    };
  });
}
