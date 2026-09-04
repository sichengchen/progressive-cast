import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useParams,
} from "@tanstack/react-router";

import { AppShell } from "@/app-shell";
import { DownloadedRoutePage } from "@/routes/downloaded-route";
import { FavoritesRoutePage } from "@/routes/favorites-route";
import { LibraryRoutePage } from "@/routes/library-route";
import { PodcastRoutePage } from "@/routes/podcast-route";
import { ResumePlayingRoutePage } from "@/routes/resume-playing-route";
import { SearchRoutePage } from "@/routes/search-route";
import { SettingsRoutePage } from "@/routes/settings-route";
import { WhatsNewRoutePage } from "@/routes/whats-new-route";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  beforeLoad: () => {
    throw redirect({ to: "/whats-new" });
  },
  getParentRoute: () => rootRoute,
  path: "/",
});

const whatsNewRoute = createRoute({
  component: WhatsNewRoutePage,
  getParentRoute: () => rootRoute,
  path: "/whats-new",
});

const searchRoute = createRoute({
  component: SearchRoutePage,
  getParentRoute: () => rootRoute,
  path: "/search",
});

const libraryRoute = createRoute({
  component: LibraryRoutePage,
  getParentRoute: () => rootRoute,
  path: "/library",
});

const resumePlayingRoute = createRoute({
  component: ResumePlayingRoutePage,
  getParentRoute: () => rootRoute,
  path: "/resume-playing",
});

const downloadedRoute = createRoute({
  component: DownloadedRoutePage,
  getParentRoute: () => rootRoute,
  path: "/downloaded",
});

const favoritesRoute = createRoute({
  component: FavoritesRoutePage,
  getParentRoute: () => rootRoute,
  path: "/favorites",
});

const settingsRoute = createRoute({
  component: SettingsRoutePage,
  getParentRoute: () => rootRoute,
  path: "/settings",
});

function PodcastRouteComponent() {
  const { podcastId } = useParams({ from: "/podcast/$podcastId" });
  return <PodcastRoutePage podcastId={podcastId} />;
}

const podcastRoute = createRoute({
  component: PodcastRouteComponent,
  getParentRoute: () => rootRoute,
  path: "/podcast/$podcastId",
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  whatsNewRoute,
  libraryRoute,
  resumePlayingRoute,
  downloadedRoute,
  favoritesRoute,
  settingsRoute,
  podcastRoute,
]);

export const router = createRouter({
  defaultPreload: "intent",
  history: createHashHistory(),
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
