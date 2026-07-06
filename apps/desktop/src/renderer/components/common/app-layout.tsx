"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { usePodcastStore } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";

const DEFAULT_SIDEBAR_WIDTH = 320;
const DEFAULT_RIGHT_PANEL_WIDTH = 384;
const MIN_SIDEBAR_WIDTH = 240;
const MIN_MAIN_CONTENT_WIDTH = 320;
const MIN_RIGHT_PANEL_WIDTH = 280;

interface AppLayoutProps {
  sidebar: ReactNode;
  mainContent: ReactNode;
  rightPanel: ReactNode;
  controlBar: ReactNode;
}

type PanelResizeKind = "sidebar" | "rightPanel";

interface ActiveResize {
  containerWidth: number;
  kind: PanelResizeKind;
  rightPanelWidth: number;
  sidebarWidth: number;
  startX: number;
}

interface PanelSizes {
  rightPanelWidth: number;
  sidebarWidth: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function AppLayout({ sidebar, mainContent, rightPanel, controlBar }: AppLayoutProps) {
  const { showNotesOpen } = usePodcastStore();
  const isMobile = useIsMobile();
  const desktopLayoutRef = useRef<HTMLDivElement>(null);
  const [activeResize, setActiveResize] = useState<ActiveResize | null>(null);
  const [panelSizes, setPanelSizes] = useState<PanelSizes>({
    rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  });

  const clampPanelSizes = useCallback(
    (sizes: PanelSizes, containerWidth: number): PanelSizes => {
      if (!showNotesOpen) {
        return {
          ...sizes,
          sidebarWidth: clamp(
            sizes.sidebarWidth,
            MIN_SIDEBAR_WIDTH,
            containerWidth - MIN_MAIN_CONTENT_WIDTH,
          ),
        };
      }

      const rightPanelWidth = clamp(
        sizes.rightPanelWidth,
        MIN_RIGHT_PANEL_WIDTH,
        containerWidth - sizes.sidebarWidth - MIN_MAIN_CONTENT_WIDTH,
      );

      return {
        rightPanelWidth,
        sidebarWidth: clamp(
          sizes.sidebarWidth,
          MIN_SIDEBAR_WIDTH,
          containerWidth - MIN_MAIN_CONTENT_WIDTH - rightPanelWidth,
        ),
      };
    },
    [showNotesOpen],
  );

  useEffect(() => {
    const clampToContainer = () => {
      const containerWidth = desktopLayoutRef.current?.getBoundingClientRect().width;

      if (!containerWidth) {
        return;
      }

      setPanelSizes((sizes) => clampPanelSizes(sizes, containerWidth));
    };

    clampToContainer();
    window.addEventListener("resize", clampToContainer);

    return () => window.removeEventListener("resize", clampToContainer);
  }, [clampPanelSizes]);

  useEffect(() => {
    if (!activeResize) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - activeResize.startX;

      setPanelSizes((sizes) => {
        if (activeResize.kind === "sidebar") {
          const rightPanelWidth = showNotesOpen
            ? clamp(
                sizes.rightPanelWidth,
                MIN_RIGHT_PANEL_WIDTH,
                activeResize.containerWidth - MIN_SIDEBAR_WIDTH - MIN_MAIN_CONTENT_WIDTH,
              )
            : sizes.rightPanelWidth;

          return {
            rightPanelWidth,
            sidebarWidth: clamp(
              activeResize.sidebarWidth + deltaX,
              MIN_SIDEBAR_WIDTH,
              activeResize.containerWidth -
                MIN_MAIN_CONTENT_WIDTH -
                (showNotesOpen ? rightPanelWidth : 0),
            ),
          };
        }

        return {
          ...sizes,
          rightPanelWidth: clamp(
            activeResize.rightPanelWidth - deltaX,
            MIN_RIGHT_PANEL_WIDTH,
            activeResize.containerWidth - sizes.sidebarWidth - MIN_MAIN_CONTENT_WIDTH,
          ),
        };
      });
    };

    const handlePointerUp = () => setActiveResize(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeResize, showNotesOpen]);

  const startResize = useCallback(
    (kind: PanelResizeKind) => (event: ReactPointerEvent<HTMLDivElement>) => {
      const containerWidth = desktopLayoutRef.current?.getBoundingClientRect().width;

      if (!containerWidth) {
        return;
      }

      event.preventDefault();
      setActiveResize({
        containerWidth,
        kind,
        rightPanelWidth: panelSizes.rightPanelWidth,
        sidebarWidth: panelSizes.sidebarWidth,
        startX: event.clientX,
      });
    },
    [panelSizes],
  );

  return (
    <>
      {isMobile ? (
        <div className="flex flex-col h-screen app-no-drag">
          {/* Mobile: Show Notes Overlay */}
          {showNotesOpen && <div className="fixed inset-0 z-40 bg-background">{rightPanel}</div>}

          {/* Mobile: Main Content */}
          <div className="flex-1 overflow-hidden">{mainContent}</div>

          {/* Mobile: Control Bar (Audio Player) */}
          {controlBar}
        </div>
      ) : (
        <div ref={desktopLayoutRef} className="flex h-screen overflow-hidden">
          {/* Desktop: Sidebar */}
          <div
            className="flex-shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
            style={{
              minWidth: MIN_SIDEBAR_WIDTH,
              width: panelSizes.sidebarWidth,
            }}
          >
            {sidebar}
          </div>

          <ResizeHandle
            ariaLabel="Resize sidebar"
            onPointerDown={startResize("sidebar")}
          />

          {/* Desktop: Main Content Area */}
          <div className="app-drag desktop-window-content-safe-area flex min-w-0 flex-1 overflow-hidden">
            {/* Main Content */}
            <div className="min-w-0 flex-1 bg-background overflow-hidden">{mainContent}</div>

            {/* Right Panel (Show Notes) */}
            {showNotesOpen && (
              <ResizeHandle
                ariaLabel="Resize show notes"
                onPointerDown={startResize("rightPanel")}
              />
            )}

            <div
              className={`flex-shrink-0 border-l border-sidebar-border bg-background ${
                showNotesOpen ? "" : "overflow-hidden"
              } ${activeResize?.kind === "rightPanel" ? "no-transition" : "transition-[width] duration-200 ease-in-out"}`}
              style={{
                minWidth: showNotesOpen ? MIN_RIGHT_PANEL_WIDTH : 0,
                width: showNotesOpen ? panelSizes.rightPanelWidth : 0,
              }}
            >
              {showNotesOpen && rightPanel}
            </div>
          </div>

          {/* Desktop: Control Bar (Audio Player) */}
          {controlBar}
        </div>
      )}
    </>
  );
}

function ResizeHandle({
  ariaLabel,
  onPointerDown,
}: {
  ariaLabel: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="app-no-drag relative z-20 w-0 flex-shrink-0 cursor-col-resize"
      onPointerDown={onPointerDown}
      role="separator"
    >
      <div className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2" />
    </div>
  );
}
