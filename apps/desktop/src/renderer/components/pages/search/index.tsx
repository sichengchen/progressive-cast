"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  CircleOff,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  List,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemLeading,
  ListItemMeta,
  ListItemTitle,
  ListItemTrailing,
} from "@/components/ui-custom/list";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { desktopApi } from "@/desktop-api";
import { iTunesService, type iTunesPodcast } from "@/lib/itunes-service";
import { usePodcastStore } from "@/lib/store";
import type { Episode, Podcast } from "@/lib/types";
import { formatDate, formatTime, richTextToPlainText } from "@/lib/utils";
import type { EpisodeSummary } from "../../../../shared/types";

type SearchSource = "discover" | "library";
type SearchFilter = "top" | "podcasts" | "episodes";

interface RankedPodcast {
  podcast: Podcast;
  score: number;
}

interface RankedEpisode {
  episode: Episode;
  publishedAtTime: number;
  score: number;
}

interface PodcastSearchEntry {
  normalizedAuthor: string;
  normalizedDescription: string;
  normalizedTitle: string;
  podcast: Podcast;
  titleWords: string[];
}

interface EpisodeSearchEntry {
  episode: Episode;
  normalizedBody: string;
  normalizedTitle: string;
  publishedAtTime: number;
  titleWords: string[];
}

const resultRenderLimit = 75;
const emptyLibraryResults = {
  episodes: [] as RankedEpisode[],
  podcasts: [] as RankedPodcast[],
};

const filters: Array<{ label: string; value: SearchFilter }> = [
  { label: "Top Results", value: "top" },
  { label: "Podcasts", value: "podcasts" },
  { label: "Episodes", value: "episodes" },
];

function normalizeSearchText(value: string | null | undefined) {
  return richTextToPlainText(value).toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeFeedUrl(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function splitNormalizedWords(value: string) {
  return value ? value.split(/\s+/) : [];
}

function toSearchDate(value?: string) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toSearchEpisode(episode: EpisodeSummary): Episode {
  return {
    audioUrl: episode.audioUrl,
    content: episode.content,
    description: episode.description ?? "",
    downloadedAt: episode.downloadedAt ? toSearchDate(episode.downloadedAt) : undefined,
    downloadedPath: episode.downloadedPath,
    duration: episode.duration,
    fileSize: episode.fileSize,
    guid: episode.guid,
    id: episode.id,
    imageUrl: episode.imageUrl,
    isDownloaded: Boolean(episode.downloadedPath),
    podcastId: episode.podcastId,
    publishedAt: toSearchDate(episode.publishedAt),
    showNotes: episode.content,
    title: episode.title,
  };
}

function titleMatchScore(normalizedTitle: string, titleWords: string[], query: string) {
  if (!normalizedTitle || !query) {
    return null;
  }

  if (normalizedTitle === query) {
    return 0;
  }

  if (normalizedTitle.startsWith(query)) {
    return 1;
  }

  if (titleWords.some((word) => word.startsWith(query))) {
    return 2;
  }

  if (normalizedTitle.includes(query)) {
    return 3;
  }

  return null;
}

function createPodcastSearchEntry(podcast: Podcast): PodcastSearchEntry {
  const normalizedTitle = normalizeSearchText(podcast.title);

  return {
    normalizedAuthor: normalizeSearchText(podcast.author),
    normalizedDescription: normalizeSearchText(podcast.description),
    normalizedTitle,
    podcast,
    titleWords: splitNormalizedWords(normalizedTitle),
  };
}

function createEpisodeSearchEntry(episode: Episode): EpisodeSearchEntry {
  const normalizedTitle = normalizeSearchText(episode.title);
  const normalizedBody = [
    episode.description,
    episode.showNotes,
    episode.content,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return {
    episode,
    normalizedBody,
    normalizedTitle,
    publishedAtTime: new Date(episode.publishedAt).getTime(),
    titleWords: splitNormalizedWords(normalizedTitle),
  };
}

function podcastMatchScore(entry: PodcastSearchEntry, query: string) {
  const titleScore = titleMatchScore(entry.normalizedTitle, entry.titleWords, query);

  if (titleScore !== null) {
    return titleScore;
  }

  if (entry.normalizedAuthor.includes(query)) {
    return 4;
  }

  if (entry.normalizedDescription.includes(query)) {
    return 5;
  }

  return null;
}

function episodeMatchScore(entry: EpisodeSearchEntry, query: string) {
  const titleScore = titleMatchScore(entry.normalizedTitle, entry.titleWords, query);

  if (titleScore !== null) {
    return titleScore;
  }

  if (entry.normalizedBody.includes(query)) {
    return 5;
  }

  return null;
}

function sortRankedPodcasts(a: RankedPodcast, b: RankedPodcast) {
  if (a.score !== b.score) {
    return a.score - b.score;
  }

  return a.podcast.title.localeCompare(b.podcast.title);
}

function sortRankedEpisodes(a: RankedEpisode, b: RankedEpisode) {
  if (a.score !== b.score) {
    return a.score - b.score;
  }

  return b.publishedAtTime - a.publishedAtTime;
}

function getLibraryResults(
  query: string,
  podcasts: PodcastSearchEntry[],
  episodes: EpisodeSearchEntry[],
) {
  if (!query) {
    return emptyLibraryResults;
  }

  const rankedPodcasts = podcasts
    .map((entry) => {
      const score = podcastMatchScore(entry, query);
      return score === null ? null : { podcast: entry.podcast, score };
    })
    .filter((result): result is RankedPodcast => result !== null)
    .sort(sortRankedPodcasts);

  const rankedEpisodes = episodes
    .map((entry) => {
      const score = episodeMatchScore(entry, query);
      return score === null
        ? null
        : {
            episode: entry.episode,
            publishedAtTime: entry.publishedAtTime,
            score,
          };
    })
    .filter((result): result is RankedEpisode => result !== null)
    .sort(sortRankedEpisodes);

  return {
    episodes: rankedEpisodes,
    podcasts: rankedPodcasts,
  };
}

function EmptyState({
  description,
  icon = <Search className="h-8 w-8" />,
  title,
}: {
  description?: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-4 py-12">
      <div className="max-w-sm text-center text-muted-foreground">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm">{description}</p> : null}
      </div>
    </div>
  );
}

function TruncatedResultsNote({
  shownCount,
  totalCount,
}: {
  shownCount: number;
  totalCount: number;
}) {
  return (
    <p className="px-4 py-3 text-xs text-muted-foreground">
      Showing first {shownCount} of {totalCount} results. Narrow your search to see more.
    </p>
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeSource, setActiveSource] = useState<SearchSource>("discover");
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("top");
  const [discoverResults, setDiscoverResults] = useState<iTunesPodcast[]>([]);
  const [discoverTerm, setDiscoverTerm] = useState("");
  const [hasDiscoverSearched, setHasDiscoverSearched] = useState(false);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  const [isLibraryHydrating, setIsLibraryHydrating] = useState(false);
  const [searchEpisodes, setSearchEpisodes] = useState<Episode[]>(
    () => usePodcastStore.getState().libraryEpisodes,
  );
  const [subscribingFeedUrl, setSubscribingFeedUrl] = useState<string | null>(null);
  const discoverRequestId = useRef(0);
  const latestLibraryEpisodesRef = useRef(searchEpisodes);

  const podcasts = usePodcastStore((state) => state.podcasts);
  const libraryEpisodes = usePodcastStore((state) => state.libraryEpisodes);
  const preferences = usePodcastStore((state) => state.preferences);
  const playEpisode = usePodcastStore((state) => state.playEpisode);
  const setSelectedPodcast = usePodcastStore((state) => state.setSelectedPodcast);
  const subscribeToPodcast = usePodcastStore((state) => state.subscribeToPodcast);

  const discoverEnabled = preferences.itunesSearchEnabled ?? true;
  const source: SearchSource = discoverEnabled ? activeSource : "library";
  const currentDiscoverTerm = query.trim();
  const hasCurrentDiscoverResults =
    hasDiscoverSearched && currentDiscoverTerm === discoverTerm;
  const normalizedLibraryQuery =
    source === "library" ? normalizeSearchText(deferredQuery) : "";

  useEffect(() => {
    if (!discoverEnabled && activeSource !== "library") {
      setActiveSource("library");
    }
  }, [activeSource, discoverEnabled]);

  useEffect(() => {
    latestLibraryEpisodesRef.current = libraryEpisodes;
    setSearchEpisodes(libraryEpisodes);
  }, [libraryEpisodes]);

  useEffect(() => {
    if (source !== "library") {
      return;
    }

    if (podcasts.length === 0) {
      setSearchEpisodes([]);
      setIsLibraryHydrating(false);
      return;
    }

    let cancelled = false;
    setIsLibraryHydrating(true);

    void desktopApi.episodes
      .listAll()
      .then((episodes) => {
        if (!cancelled) {
          const mappedEpisodes = episodes.map(toSearchEpisode);
          setSearchEpisodes(mappedEpisodes);
          latestLibraryEpisodesRef.current = mappedEpisodes;
        }
      })
      .catch((error) => {
        console.error("Failed to hydrate library episodes for search:", error);

        if (!cancelled) {
          setSearchEpisodes(latestLibraryEpisodesRef.current);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLibraryHydrating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [podcasts.length, source]);

  const subscribedFeedUrls = useMemo(
    () => new Set(podcasts.map((podcast) => normalizeFeedUrl(podcast.feedUrl))),
    [podcasts],
  );

  const podcastById = useMemo(
    () => new Map(podcasts.map((podcast) => [podcast.id, podcast])),
    [podcasts],
  );

  const podcastSearchIndex = useMemo(
    () => podcasts.map(createPodcastSearchEntry),
    [podcasts],
  );

  const episodeSearchIndex = useMemo(
    () => searchEpisodes.map(createEpisodeSearchEntry),
    [searchEpisodes],
  );

  const filteredDiscoverResults = useMemo(
    () =>
      discoverResults.filter(
        (podcast) => !subscribedFeedUrls.has(normalizeFeedUrl(podcast.feedUrl)),
      ),
    [discoverResults, subscribedFeedUrls],
  );

  const libraryResults = useMemo(
    () =>
      source === "library"
        ? getLibraryResults(normalizedLibraryQuery, podcastSearchIndex, episodeSearchIndex)
        : emptyLibraryResults,
    [episodeSearchIndex, normalizedLibraryQuery, podcastSearchIndex, source],
  );

  const getResultCount = (filter: SearchFilter) =>
    source === "discover"
      ? !hasCurrentDiscoverResults || filter === "episodes"
        ? 0
        : filteredDiscoverResults.length
      : filter === "episodes"
        ? libraryResults.episodes.length
        : filter === "podcasts"
          ? libraryResults.podcasts.length
          : libraryResults.podcasts.length + libraryResults.episodes.length;

  const activeResultCount = getResultCount(activeFilter);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (source !== "discover") {
      return;
    }

    const term = query.trim();

    if (!term) {
      setDiscoverResults([]);
      setDiscoverTerm("");
      setHasDiscoverSearched(false);
      return;
    }

    const requestId = discoverRequestId.current + 1;
    discoverRequestId.current = requestId;
    setDiscoverTerm(term);
    setHasDiscoverSearched(true);
    setIsDiscoverLoading(true);

    try {
      const response = await iTunesService.searchPodcasts(term, 20);

      if (discoverRequestId.current === requestId) {
        setDiscoverResults(response.results);
      }
    } catch (error) {
      if (discoverRequestId.current === requestId) {
        setDiscoverResults([]);
      }
      toast.error(error instanceof Error ? error.message : "Failed to search Discover");
      console.error("Discover search error:", error);
    } finally {
      if (discoverRequestId.current === requestId) {
        setIsDiscoverLoading(false);
      }
    }
  };

  const handleClearQuery = () => {
    setQuery("");
    setDiscoverResults([]);
    setDiscoverTerm("");
    setHasDiscoverSearched(false);
  };

  const handleSubscribe = async (podcast: iTunesPodcast) => {
    if (!podcast.feedUrl) {
      toast.error("This podcast does not have a valid RSS feed URL");
      return;
    }

    setSubscribingFeedUrl(podcast.feedUrl);

    try {
      await subscribeToPodcast(podcast.feedUrl);
      toast.success(`Subscribed to ${podcast.title}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to subscribe to podcast");
      console.error("Subscribe error:", error);
    } finally {
      setSubscribingFeedUrl(null);
    }
  };

  const handleOpenPodcast = (podcastId: string) => {
    setSelectedPodcast(podcastId);
    navigate({
      params: { podcastId },
      to: "/podcast/$podcastId",
    });
  };

  const handlePlayEpisode = (episode: Episode) => {
    playEpisode(episode);
  };

  const renderDiscoverContent = (filter: SearchFilter) => {
    if (!query.trim()) {
      return (
        <EmptyState
          title="Search Discover"
          description="Find podcasts to add to your library."
        />
      );
    }

    if (isDiscoverLoading) {
      return (
        <EmptyState
          icon={<Loader2 className="h-8 w-8 animate-spin" />}
          title="Searching Discover"
          description={discoverTerm}
        />
      );
    }

    if (!hasCurrentDiscoverResults) {
      return (
        <EmptyState
          title="Ready to search Discover"
          description="Press Enter or the search button when your query is ready."
        />
      );
    }

    if (filter === "episodes") {
      return (
        <EmptyState
          icon={<CircleOff className="h-8 w-8" />}
          title="No Discover episodes"
          description="Discover search returns podcasts only. Switch to Library to search episodes."
        />
      );
    }

    if (filteredDiscoverResults.length === 0) {
      return (
        <EmptyState
          title="No new podcasts found"
          description="Matching results may already be in your library."
        />
      );
    }

    const visibleDiscoverResults = filteredDiscoverResults.slice(0, resultRenderLimit);

    return (
      <>
        <List className="px-0">
          {visibleDiscoverResults.map((podcast) => (
            <DiscoverPodcastRow
              key={`${podcast.id}-${podcast.feedUrl}`}
              podcast={podcast}
              isSubscribing={subscribingFeedUrl === podcast.feedUrl}
              onOpenExternal={() => {
                if (podcast.itunesUrl) {
                  window.open(podcast.itunesUrl, "_blank", "noopener,noreferrer");
                }
              }}
              onSubscribe={() => void handleSubscribe(podcast)}
            />
          ))}
        </List>
        {filteredDiscoverResults.length > visibleDiscoverResults.length ? (
          <TruncatedResultsNote
            shownCount={visibleDiscoverResults.length}
            totalCount={filteredDiscoverResults.length}
          />
        ) : null}
      </>
    );
  };

  const renderLibraryContent = (filter: SearchFilter) => {
    if (!query.trim()) {
      return (
        <EmptyState
          title="Search your library"
          description="Search subscribed podcasts and saved episode text."
        />
      );
    }

    const tabResultCount = getResultCount(filter);

    if (tabResultCount === 0 && isLibraryHydrating) {
      return (
        <EmptyState
          icon={<Loader2 className="h-8 w-8 animate-spin" />}
          title="Searching your library"
          description="Loading local episodes."
        />
      );
    }

    if (tabResultCount === 0) {
      return (
        <EmptyState
          title="No library matches"
          description="Try a podcast title, author, episode title, or show-note term."
        />
      );
    }

    const visiblePodcasts =
      filter === "episodes"
        ? []
        : libraryResults.podcasts.slice(0, resultRenderLimit);
    const remainingEpisodeSlots =
      filter === "top"
        ? Math.max(resultRenderLimit - visiblePodcasts.length, 0)
        : resultRenderLimit;
    const visibleEpisodes =
      filter === "podcasts"
        ? []
        : libraryResults.episodes.slice(0, remainingEpisodeSlots);
    const shownResultCount = visiblePodcasts.length + visibleEpisodes.length;

    return (
      <>
        <List className="px-0">
          {visiblePodcasts.map(({ podcast }) => (
            <LibraryPodcastRow
              key={podcast.id}
              podcast={podcast}
              onOpen={() => handleOpenPodcast(podcast.id)}
            />
          ))}

          {visibleEpisodes.map(({ episode }) => (
            <LibraryEpisodeRow
              key={episode.id}
              episode={episode}
              podcast={podcastById.get(episode.podcastId)}
              onPlay={() => handlePlayEpisode(episode)}
            />
          ))}
        </List>
        {tabResultCount > shownResultCount ? (
          <TruncatedResultsNote shownCount={shownResultCount} totalCount={tabResultCount} />
        ) : null}
      </>
    );
  };

  const renderResultsContent = (filter: SearchFilter) =>
    source === "discover" ? renderDiscoverContent(filter) : renderLibraryContent(filter);

  return (
    <div className="py-4">
      <Tabs
        className="flex flex-col gap-5"
        onValueChange={(value) => setActiveFilter(value as SearchFilter)}
        value={activeFilter}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-2 pt-3">
          <form className="flex w-full items-center gap-2" onSubmit={handleSubmit}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                className="h-10 bg-background pl-9 pr-10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search in ${source === "discover" ? "Discover" : "Library"}`}
                value={query}
              />
              {query ? (
                <Button
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                  onClick={handleClearQuery}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {source === "discover" ? (
              <Button
                aria-label="Search"
                className="h-10"
                disabled={!query.trim() || isDiscoverLoading}
                type="submit"
              >
                {isDiscoverLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>Search</span>
              </Button>
            ) : null}
          </form>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              className="w-full md:w-auto"
              onValueChange={(value) => setActiveSource(value as SearchSource)}
              value={source}
            >
              <TabsList className="w-full md:w-auto">
                {discoverEnabled ? <TabsTrigger value="discover">Discover</TabsTrigger> : null}
                <TabsTrigger value="library">Library</TabsTrigger>
              </TabsList>
            </Tabs>

            <TabsList className="grid w-full grid-cols-3 md:w-auto">
              {filters.map((filter) => (
                <TabsTrigger key={filter.value} value={filter.value}>
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="px-2">
          <div className="mx-auto max-w-4xl">
            {query.trim() ? (
              <div className="mb-2 px-4 text-xs font-medium text-muted-foreground">
                {source === "discover"
                  ? isDiscoverLoading
                    ? "Searching Discover"
                    : hasCurrentDiscoverResults
                      ? `${activeResultCount} result${activeResultCount === 1 ? "" : "s"} in Discover`
                      : "Discover searches when submitted"
                  : `${activeResultCount} result${activeResultCount === 1 ? "" : "s"} in Library`}
              </div>
            ) : null}

            {filters.map((filter) => (
              <TabsContent className="mt-0" key={filter.value} value={filter.value}>
                {filter.value === activeFilter ? renderResultsContent(filter.value) : null}
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function DiscoverPodcastRow({
  isSubscribing,
  onOpenExternal,
  onSubscribe,
  podcast,
}: {
  isSubscribing: boolean;
  onOpenExternal: () => void;
  onSubscribe: () => void;
  podcast: iTunesPodcast;
}) {
  return (
    <ListItem className="px-3 py-3">
      <ListItemLeading>
        <CoverImage
          alt={`${podcast.title} cover`}
          className="h-14 w-14 rounded-md"
          loading="lazy"
          src={podcast.imageUrl}
        />
      </ListItemLeading>

      <ListItemContent className="min-w-0">
        <ListItemMeta>Podcast</ListItemMeta>
        <ListItemTitle className="line-clamp-1 text-base">{podcast.title}</ListItemTitle>
        <ListItemDescription className="line-clamp-1">
          {[podcast.author, podcast.genre].filter(Boolean).join(" · ") || "Discover"}
        </ListItemDescription>
      </ListItemContent>

      <ListItemTrailing className="flex items-center gap-1">
        {podcast.itunesUrl ? (
          <Button
            aria-label={`Open external listing for ${podcast.title}`}
            onClick={onOpenExternal}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          disabled={isSubscribing}
          onClick={onSubscribe}
          size="sm"
          type="button"
          variant="secondary"
        >
          {isSubscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span>Subscribe</span>
        </Button>
      </ListItemTrailing>
    </ListItem>
  );
}

function LibraryPodcastRow({
  onOpen,
  podcast,
}: {
  onOpen: () => void;
  podcast: Podcast;
}) {
  return (
    <ListItem
      className="group px-3 py-3"
      interactive
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
    >
      <ListItemLeading>
        <CoverImage
          alt={`${podcast.title} cover`}
          className="h-14 w-14 rounded-md"
          loading="lazy"
          src={podcast.imageUrl}
        />
      </ListItemLeading>

      <ListItemContent className="min-w-0">
        <ListItemMeta>Podcast</ListItemMeta>
        <ListItemTitle className="line-clamp-1 text-base">{podcast.title}</ListItemTitle>
        <ListItemDescription className="line-clamp-1">
          {podcast.author || richTextToPlainText(podcast.description) || "Subscribed podcast"}
        </ListItemDescription>
      </ListItemContent>

      <ListItemTrailing>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </ListItemTrailing>
    </ListItem>
  );
}

function LibraryEpisodeRow({
  episode,
  onPlay,
  podcast,
}: {
  episode: Episode;
  onPlay: () => void;
  podcast?: Podcast;
}) {
  return (
    <ListItem
      className="group px-3 py-3"
      interactive
      onClick={onPlay}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPlay();
        }
      }}
      role="button"
    >
      <ListItemLeading>
        <CoverImage
          alt={`${episode.title} cover`}
          className="h-14 w-14 rounded-md"
          loading="lazy"
          src={episode.imageUrl || podcast?.imageUrl}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-current text-white" />
          </div>
        </CoverImage>
      </ListItemLeading>

      <ListItemContent className="min-w-0">
        <ListItemMeta>
          {[
            podcast?.title,
            formatDate(episode.publishedAt),
            episode.duration ? formatTime(episode.duration) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </ListItemMeta>
        <ListItemTitle className="line-clamp-1 text-base">{episode.title}</ListItemTitle>
        <ListItemDescription className="line-clamp-1">
          {richTextToPlainText(episode.description || episode.showNotes || episode.content)}
        </ListItemDescription>
      </ListItemContent>

      <ListItemTrailing>
        <Button
          aria-label={`Play ${episode.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onPlay();
          }}
          size="icon"
          type="button"
          variant="secondary"
        >
          <Play className="h-4 w-4 fill-current" />
        </Button>
      </ListItemTrailing>
    </ListItem>
  );
}
