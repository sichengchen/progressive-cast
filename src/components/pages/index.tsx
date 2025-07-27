"use client";

import React, { ReactNode, useState } from "react";

import { APP_NAME } from "@/lib/constants";
import { usePodcastStore } from "@/lib/store";

import { useIsMobile } from "@/hooks/use-mobile";
import {
    Sparkles,
    History,
    Download,
    Settings,
    Radio,
    ArrowLeft,
    LucideIcon,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    MobileTabBar,
    type MobileTabBarItem,
} from "@/components/ui-custom/mobile-tab-bar";

import { WelcomeScreen } from "@/components/common/welcome";
import { AddPodcastDialog } from "@/components/common/add-podcast-dialog";

import { SettingsPage } from "./settings";
import { WhatsNewPage } from "./whats-new";
import { ResumePlayingPage } from "./resume-playing";
import { DownloadedPage } from "./downloaded";
import { PodcastPage } from "./podcast";
import { LibraryPage } from "./library";
import { ScrollingText } from "../ui/scrolling-text";

interface ToolBarItemButton {
    inner: ReactNode;
    action: () => void;
}

interface MainContentLayoutProps {
    children?: ReactNode;
    title?: string;
    backTo?: string;
    toolBar?: ToolBarItemButton[];
}

const MainContentLayout = (props: MainContentLayoutProps) => {
    const isMobile = useIsMobile();
    const { playbackState, currentPage, setCurrentPage, showAddPodcastDialog, setShowAddPodcastDialog } = usePodcastStore();
    const { children, title, backTo, toolBar } = props;

    // Check if audio player should be shown and space reserved
    const hasActiveEpisode = !!playbackState.currentEpisode;

    // Mobile tab bar configuration
    const mobileTabItems: MobileTabBarItem[] = [
        {
            id: "whats-new",
            label: "What's New",
            icon: Sparkles,
        },
        {
            id: "library",
            label: "Library",
            icon: Radio,
        },
        {
            id: "settings",
            label: "Settings",
            icon: Settings,
        },
    ];

    return (
        <>
            <div className="h-full flex flex-col">
                <div
                    className="flex-1 overflow-y-auto"
                    style={{
                        paddingBottom: isMobile
                            ? hasActiveEpisode
                                ? "calc(10rem + env(safe-area-inset-bottom))" // Space for both audio player and tabbar
                                : "calc(4rem + env(safe-area-inset-bottom))" // Space for tabbar only
                            : hasActiveEpisode
                            ? "calc(6rem + env(safe-area-inset-bottom))" // Desktop audio player only
                            : "0",
                    }}
                >
                    <div className="px-4 py-3 max-w-6xl mx-auto">
                        {title ? (
                            <>
                                <div className="flex items-center gap-3 px-2 mt-6">
                                    {/* Mobile back button */}
                                    {isMobile && backTo && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setCurrentPage(backTo as any)
                                            }
                                            className="p-2 -ml-2"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                    )}
                                    <h1 className="text-2xl font-bold flex-1 line-clamp-1">
                                        {title}
                                    </h1>
                                    {isMobile && toolBar && (
                                        <>
                                            {toolBar.map((item, index) => (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        item.action();
                                                    }}
                                                    className="p-2"
                                                >
                                                    {item.inner}
                                                </Button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <></>
                        )}

                        {children}
                    </div>
                </div>
            </div>

            {/* Mobile Tab Bar */}
            {isMobile && (
                <MobileTabBar
                    items={mobileTabItems}
                    activeTab={
                        ["podcasts", "resume-playing", "downloaded"].includes(
                            currentPage
                        )
                            ? "library"
                            : currentPage
                    }
                    onTabChange={(tabId) => {
                        const validPages = [
                            "whats-new",
                            "library",
                            "settings",
                            "podcasts",
                            "resume-playing",
                            "downloaded",
                        ] as const;
                        if (validPages.includes(tabId as any)) {
                            setCurrentPage(tabId as any);
                        }
                    }}
                    variant="default"
                />
            )}

            {/* Add Podcast Dialog - Global */}
            <AddPodcastDialog
                open={showAddPodcastDialog}
                onOpenChange={setShowAddPodcastDialog}
            />
        </>
    );
};

export const MainContent = () => {
    const { podcasts, currentPage, selectedPodcastId, setShowAddPodcastDialog } = usePodcastStore();

    // If there are no podcasts at all, always show welcome screen regardless of currentPage
    if (podcasts.length === 0 && currentPage !== "settings") {
        return (
            <MainContentLayout>
                <WelcomeScreen />
            </MainContentLayout>
        );
    }

    // Handle different page views (only when user has podcasts)
    if (currentPage === "whats-new") {
        return (
            <MainContentLayout title="What's New">
                <WhatsNewPage />
            </MainContentLayout>
        );
    }

    if (currentPage === "resume-playing") {
        return (
            <MainContentLayout title="Resume Playing" backTo="library">
                <ResumePlayingPage />
            </MainContentLayout>
        );
    }

    if (currentPage === "downloaded") {
        return (
            <MainContentLayout title="Downloaded" backTo="library">
                <DownloadedPage />
            </MainContentLayout>
        );
    }

    const addButton: ToolBarItemButton = {
        inner: <Plus />,
        action: () => {
            setShowAddPodcastDialog(true);
        },
    };

    if (currentPage === "library") {
        return (
            <MainContentLayout title="Library" toolBar={[addButton]}>
                <LibraryPage />
            </MainContentLayout>
        );
    }

    if (currentPage === "settings") {
        return (
            <MainContentLayout title="Settings">
                <SettingsPage />
            </MainContentLayout>
        );
    }

    // Default podcast view
    const selectedPodcast = selectedPodcastId
        ? podcasts.find((p) => p.id === selectedPodcastId)
        : null;

    return (
        <MainContentLayout title={selectedPodcast?.title} backTo="library">
            <PodcastPage />
        </MainContentLayout>
    );
};
