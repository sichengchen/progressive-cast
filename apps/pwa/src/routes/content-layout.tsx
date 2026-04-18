import type { ReactNode } from "react";

import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MobileTabBar, type MobileTabBarItem } from "@/components/ui-custom/mobile-tab-bar";
import { AddPodcastDialog } from "@/components/common/add-podcast-dialog";
import { WelcomeScreen } from "@/components/common/welcome";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePodcastStore } from "@/lib/store";
import { ArrowLeft, Radio, Settings, Sparkles } from "lucide-react";

interface ToolbarAction {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
}

interface AppPageLayoutProps {
  backTo?: "/downloaded" | "/library" | "/resume-playing" | "/settings" | "/whats-new";
  children: ReactNode;
  title?: string;
  toolBar?: ToolbarAction[];
}

const mobileTabItems: MobileTabBarItem[] = [
  {
    id: "whats-new",
    icon: Sparkles,
    label: "What's New",
  },
  {
    id: "library",
    icon: Radio,
    label: "Library",
  },
  {
    id: "settings",
    icon: Settings,
    label: "Settings",
  },
];

function getActiveTab(pathname: string) {
  if (pathname.startsWith("/settings")) {
    return "settings";
  }

  if (
    pathname.startsWith("/library") ||
    pathname.startsWith("/resume-playing") ||
    pathname.startsWith("/downloaded") ||
    pathname.startsWith("/podcast/")
  ) {
    return "library";
  }

  return "whats-new";
}

export function AppPageLayout({ backTo, children, title, toolBar }: AppPageLayoutProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const playbackState = usePodcastStore((state) => state.playbackState);
  const showAddPodcastDialog = usePodcastStore((state) => state.showAddPodcastDialog);
  const setShowAddPodcastDialog = usePodcastStore((state) => state.setShowAddPodcastDialog);

  const hasActiveEpisode = !!playbackState.currentEpisode;

  return (
    <>
      <div className="flex h-full flex-col">
        <div
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: isMobile
              ? hasActiveEpisode
                ? "calc(10rem + env(safe-area-inset-bottom))"
                : "calc(4rem + env(safe-area-inset-bottom))"
              : hasActiveEpisode
                ? "calc(6rem + env(safe-area-inset-bottom))"
                : "0",
          }}
        >
          <div className="mx-auto max-w-6xl px-4 py-3">
            {title ? (
              <div className="mt-6 flex items-center gap-3 px-2">
                {isMobile && backTo ? (
                  <Button
                    className="-ml-2 p-2"
                    onClick={() => navigate({ to: backTo })}
                    size="sm"
                    variant="outline"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Back</span>
                  </Button>
                ) : null}

                <h1 className="flex-1 line-clamp-1 text-2xl font-bold">{title}</h1>

                {isMobile
                  ? toolBar?.map((item) => (
                      <Button
                        className="p-2"
                        disabled={item.disabled}
                        key={item.label}
                        onClick={item.onClick}
                        size="sm"
                        title={item.label}
                        variant="outline"
                      >
                        {item.icon}
                        <span className="sr-only">{item.label}</span>
                      </Button>
                    ))
                  : null}
              </div>
            ) : null}

            {children}
          </div>
        </div>
      </div>

      {isMobile ? (
        <MobileTabBar
          activeTab={getActiveTab(location.pathname)}
          items={mobileTabItems}
          onTabChange={(tabId) => {
            if (tabId === "library") {
              navigate({ to: "/library" });
              return;
            }

            if (tabId === "settings") {
              navigate({ to: "/settings" });
              return;
            }

            navigate({ to: "/whats-new" });
          }}
          variant="default"
        />
      ) : null}

      <AddPodcastDialog onOpenChange={setShowAddPodcastDialog} open={showAddPodcastDialog} />
    </>
  );
}

export function RequireSubscriptions({ children }: { children: ReactNode }) {
  const podcasts = usePodcastStore((state) => state.podcasts);

  if (podcasts.length === 0) {
    return (
      <AppPageLayout>
        <WelcomeScreen />
      </AppPageLayout>
    );
  }

  return <>{children}</>;
}
