import type { EpisodeSummary, PodcastSummary } from "../shared/types";
import type { LocalDatabase } from "./db";
import { RssService } from "./rss";

export class LibraryService {
  constructor(
    private readonly db: LocalDatabase,
    private readonly rss = new RssService(),
  ) {}

  async listPodcasts(): Promise<PodcastSummary[]> {
    return this.db.listPodcasts();
  }

  async subscribe(feedUrl: string): Promise<PodcastSummary> {
    const { episodes, podcast } = await this.rss.fetchFeed(feedUrl);
    this.db.upsertPodcast(podcast);
    this.db.upsertEpisodes(episodes);
    this.db.appendOutbox("subscription.upsert", { feedUrl: podcast.feedUrl });
    return podcast;
  }

  async unsubscribe(podcastId: string): Promise<void> {
    const podcast = this.db.deletePodcast(podcastId);
    if (podcast) {
      this.db.appendOutbox("subscription.delete", { feedUrl: podcast.feedUrl });
    }
  }

  async refresh(podcastId: string): Promise<PodcastSummary> {
    const existing = this.db.getPodcast(podcastId);
    if (!existing) {
      throw new Error("Podcast not found");
    }

    const { episodes, podcast } = await this.rss.fetchFeed(existing.feedUrl);
    const refreshedPodcast = {
      ...podcast,
      subscriptionDate: existing.subscriptionDate,
    };
    this.db.upsertPodcast(refreshedPodcast);
    this.db.upsertEpisodes(episodes);
    return refreshedPodcast;
  }

  async listEpisodesByPodcast(podcastId: string): Promise<EpisodeSummary[]> {
    return this.db.listEpisodesByPodcast(podcastId);
  }
}
