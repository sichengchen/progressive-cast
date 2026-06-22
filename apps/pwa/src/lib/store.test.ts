import { describe, expect, it } from "vitest";

import { createEpisode, createPodcast } from "@/test/fixtures";

import { DatabaseService } from "./database";
import { usePodcastStore } from "./store";

describe("usePodcastStore latest episodes freshness", () => {
  it("clears the latest episodes cache with an observable freshness change", () => {
    const episode = createEpisode();

    usePodcastStore.setState({
      latestEpisodesCache: {
        count: 1,
        episodes: [episode],
        timestamp: Date.now(),
      },
      latestEpisodesVersion: 3,
    });

    usePodcastStore.getState().clearLatestEpisodesCache();

    expect(usePodcastStore.getState().latestEpisodesCache).toBeNull();
    expect(usePodcastStore.getState().latestEpisodesVersion).toBe(4);
  });

  it("invalidates latest episodes when a podcast is removed", async () => {
    const podcast = createPodcast();
    const episode = createEpisode();

    await DatabaseService.addPodcast(podcast);
    await DatabaseService.addEpisodes([episode]);
    usePodcastStore.setState({
      latestEpisodesCache: {
        count: 1,
        episodes: [episode],
        timestamp: Date.now(),
      },
      latestEpisodesVersion: 1,
      podcasts: [podcast],
    });

    await usePodcastStore.getState().unsubscribeFromPodcast(podcast.id);

    expect(usePodcastStore.getState().podcasts).toEqual([]);
    expect(usePodcastStore.getState().latestEpisodesCache).toBeNull();
    expect(usePodcastStore.getState().latestEpisodesVersion).toBe(2);
  });
});
