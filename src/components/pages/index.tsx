"use client";

import { ReactNode } from "react";

import { APP_NAME } from "@/lib/constants";
import { usePodcastStore } from "@/lib/store";

import { useIsMobile } from "@/hooks/use-mobile";

import { ShowNotes } from "@/components/common/show-notes";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WelcomeScreen } from "@/components/common/welcome";

import { SettingsPage } from "./settings";
import { WhatsNewPage } from "./whats-new";
import { ResumePlayingPage } from "./resume-playing";
import { DownloadedPage } from "./downloaded";
import { PodcastPage } from "./podcast";

interface MainContentLayoutProps {
    children?: ReactNode;
    title?: string;
    description?: string;
}

const MainContentLayout = (props: MainContentLayoutProps) => {
    const isMobile = useIsMobile();
    const { showNotesOpen } = usePodcastStore();
    const { children, title, description } = props;

    const MobileHeader = () => (
        <div className="md:hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">{APP_NAME}</h1>
            </div>
        </div>
    );

    const MobileShowNotesOverlay = () =>
        isMobile &&
        showNotesOpen && (
            <div className="absolute inset-0 z-50 bg-background">
                <div className="h-full flex flex-col">
                    <ShowNotes />
                </div>
            </div>
        );

    return (
        <>
            {isMobile && <MobileHeader />}
            {isMobile ? (
                // Mobile layout - simplified
                <div className="flex-1 overflow-hidden relative">
                    <div className="max-w-6xl mx-auto px-4">{children}</div>
                    <MobileShowNotesOverlay />
                </div>
            ) : (
                // Desktop layout - with sidebar
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1">
                        <div className="h-full overflow-y-auto">
                            <div className="px-4 py-3 max-w-6xl mx-auto">
                                {title ? (
                                    <>
                                        <h1 className="text-2xl font-bold px-2 mt-6">
                                            {title}
                                        </h1>
                                        <p className="text-muted-foreground mt-2 px-2">
                                            {description}
                                        </p>
                                    </>
                                ) : (
                                    <></>
                                )}

                                {children}
                            </div>
                        </div>
                    </div>

                    {/* Show Notes Sidebar for Resume Playing page */}
                    <div
                        className={`border-l bg-background transition-all duration-300 ease-in-out ${
                            showNotesOpen ? "w-96" : "w-0 overflow-hidden"
                        }`}
                    >
                        {showNotesOpen && <ShowNotes />}
                    </div>
                </div>
            )}
        </>
    );
};

export const MainContent = () => {
    const { podcasts, currentPage } = usePodcastStore();

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
            <MainContentLayout title="Resume Playing">
                <ResumePlayingPage />
            </MainContentLayout>
        );
    }

    if (currentPage === "downloaded") {
        return (
            <MainContentLayout title="Downloaded">
                <DownloadedPage />
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
    return (
        <MainContentLayout>
            <PodcastPage />
        </MainContentLayout>
    );
};
