"use client";

import { PropsWithChildren } from "react";

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

const MainContentLayout = (props: PropsWithChildren) => {
    const isMobile = useIsMobile();
    const { showNotesOpen } = usePodcastStore();
    const { children } = props;

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
                    {children}
                    <MobileShowNotesOverlay />
                </div>
            ) : (
                // Desktop layout - with sidebar
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1">{children}</div>

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

const MainContentInner = () => {
    const { podcasts, currentPage } = usePodcastStore();

    // If there are no podcasts at all, always show welcome screen regardless of currentPage
    if (podcasts.length === 0 && currentPage !== "settings") {
        return <WelcomeScreen />;
    }

    // Handle different page views (only when user has podcasts)
    if (currentPage === "whats-new") {
        return <WhatsNewPage />;
    }

    if (currentPage === "resume-playing") {
        return <ResumePlayingPage />;
    }

    if (currentPage === "downloaded") {
        return <DownloadedPage />;
    }

    if (currentPage === "settings") {
        return <SettingsPage />;
    }

    // Default podcast view
    return <PodcastPage />;
};

export const MainContent = () => {
    return (
        <MainContentLayout>
            <MainContentInner />
        </MainContentLayout>
    );
};
