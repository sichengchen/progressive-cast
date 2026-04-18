import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useParams,
} from "@tanstack/react-router";

import { AppShell } from "@/app-shell";
import { DownloadedRoutePage } from "@/routes/downloaded-route";
import { LibraryRoutePage } from "@/routes/library-route";
import { PodcastRoutePage } from "@/routes/podcast-route";
import { ResumePlayingRoutePage } from "@/routes/resume-playing-route";
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
  whatsNewRoute,
  libraryRoute,
  resumePlayingRoute,
  downloadedRoute,
  settingsRoute,
  podcastRoute,
]);

export const router = createRouter({
  defaultPreload: "intent",
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
