"use client";

import { useState, useEffect } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import {
    SettingsGroup,
    SettingsItem,
    SettingsSwitch,
    SettingsSelect,
    SettingsAction,
    SettingsStats,
    SettingsDivider,
    SettingsAlert,
} from "@/components/ui-custom/settings";
import { usePodcastStore } from "@/lib/store";
import { APP_VERSION } from "@/lib/constants";
import { useTheme } from "next-themes";
import { OPMLManager } from "../../common/opml-manager";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export function SettingsPage() {
    const [isClearingData, setIsClearingData] = useState(false);
    const [isClearingDownloads, setIsClearingDownloads] = useState(false);
    const { theme, setTheme } = useTheme();
    const isMobile = useIsMobile();

    const {
        preferences,
        setSkipInterval,
        setAutoPlay,
        setWhatsNewCount,
        setItunesSearchEnabled,
        clearAllData,
        podcasts,
        storageStats,
        refreshStorageStats,
        clearAllDownloads,
    } = usePodcastStore();

    // Load storage stats on mount
    useEffect(() => {
        refreshStorageStats();
    }, [refreshStorageStats]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const handleSkipIntervalChange = (value: string) => {
        setSkipInterval(parseInt(value));
    };

    const handleAutoPlayChange = (checked: boolean) => {
        setAutoPlay(checked);
    };

    const handleWhatsNewCountChange = (value: string) => {
        setWhatsNewCount(parseInt(value));
    };

    const handleItunesSearchEnabledChange = (checked: boolean) => {
        setItunesSearchEnabled(checked);
    };

    const handleThemeChange = (value: string) => {
        setTheme(value);
    };

    const handleClearAllDownloads = async () => {
        setIsClearingDownloads(true);
        try {
            await clearAllDownloads();
            await refreshStorageStats();
            toast.success("All downloads have been cleared successfully!");
        } catch (error) {
            toast.error("Failed to clear downloads. Please try again.");
            console.error("Clear downloads error:", error);
        } finally {
            setIsClearingDownloads(false);
        }
    };

    const handleClearAllData = async () => {
        setIsClearingData(true);
        try {
            await clearAllData();
            toast.success("All data has been cleared successfully!");
        } catch (error) {
            toast.error("Failed to clear data. Please try again.");
            console.error("Clear data error:", error);
        } finally {
            setIsClearingData(false);
        }
    };

    return (
        <>
            <div className="space-y-6 py-4 px-2">
                {/* Theme Settings */}
                <SettingsGroup title="Appearance">
                    <SettingsSelect
                        label="Theme"
                        description="Choose your preferred theme"
                        value={theme || "system"}
                        onValueChange={handleThemeChange}
                        options={[
                            { value: "system", label: "Follow System" },
                            { value: "light", label: "Light" },
                            { value: "dark", label: "Dark" },
                        ]}
                        placeholder="Select theme"
                    />
                </SettingsGroup>

                {/* Playback Settings */}
                <SettingsGroup title="Playback">
                    <SettingsSelect
                        label="Skip Interval"
                        description="Time to skip forward/backward"
                        value={(preferences.skipInterval || 30).toString()}
                        onValueChange={handleSkipIntervalChange}
                        options={[
                            { value: "5", label: "5 seconds" },
                            { value: "10", label: "10 seconds" },
                            { value: "15", label: "15 seconds" },
                            { value: "30", label: "30 seconds" },
                            { value: "60", label: "60 seconds" },
                        ]}
                        placeholder="Select interval"
                    />

                    <SettingsSwitch
                        label="Auto Play"
                        description="Automatically play next episode"
                        checked={preferences.autoPlay || false}
                        onCheckedChange={handleAutoPlayChange}
                    />
                </SettingsGroup>

                {/* What's New Settings */}
                <SettingsGroup title="What's New">
                    <SettingsSelect
                        label="Number of Episodes"
                        description="Number of latest episodes to show in the What's New section"
                        value={(preferences.whatsNewCount || 10).toString()}
                        onValueChange={handleWhatsNewCountChange}
                        options={[
                            { value: "5", label: "5 episodes" },
                            { value: "10", label: "10 episodes" },
                            { value: "20", label: "20 episodes" },
                            { value: "50", label: "50 episodes" },
                        ]}
                        placeholder="Select count"
                    />
                </SettingsGroup>

                {/* Search Settings */}
                <SettingsGroup title="Search">
                    <SettingsSwitch
                        label="Search from iTunes"
                        description='Enable iTunes search tab in the "Add New Podcast"'
                        checked={preferences.itunesSearchEnabled ?? true}
                        onCheckedChange={handleItunesSearchEnabledChange}
                    />
                </SettingsGroup>

                {/* Storage Management */}
                <SettingsGroup title="Storage Management">
                    <SettingsStats
                        label="Storage Statistics"
                        stats={[
                            {
                                label: isMobile
                                    ? "Downloaded"
                                    : "Downloaded Episodes",
                                value: storageStats?.downloadedEpisodes || 0,
                            },
                            {
                                label: "Storage Used",
                                value: formatFileSize(
                                    storageStats?.totalSize || 0
                                ),
                            },
                        ]}
                    />

                    {storageStats &&
                        storageStats.totalSize > 500 * 1024 * 1024 && (
                            <SettingsAlert variant="warning" icon={AlertCircle}>
                                <p className="text-yellow-800 dark:text-yellow-200">
                                    You&apos;re using over 500MB of storage.
                                    Consider removing some downloads to free up
                                    space.
                                </p>
                            </SettingsAlert>
                        )}

                    <SettingsDivider>
                        <SettingsAction
                            label="Clear All Downloads"
                            description="Delete all downloaded episodes to free up storage space"
                            actionLabel="Clear Downloads"
                            loadingLabel="Clearing..."
                            onAction={handleClearAllDownloads}
                            variant="destructive"
                            icon={Trash2}
                            disabled={
                                !storageStats?.downloadedEpisodes ||
                                storageStats.downloadedEpisodes === 0 ||
                                isClearingDownloads
                            }
                            loading={isClearingDownloads}
                            confirmDialog={{
                                title: "Clear All Downloads",
                                description: `This action will permanently delete all downloaded episodes. This will free up ${formatFileSize(
                                    storageStats?.totalSize || 0
                                )} of storage space. You can re-download them later from the podcast pages.`,
                                actionLabel: "Clear Downloads",
                            }}
                        />
                    </SettingsDivider>
                </SettingsGroup>

                {/* Data Management */}
                <SettingsGroup title="Data Management">
                    <SettingsItem
                        label="OPML Management"
                        description="Import or export your podcast subscriptions"
                    >
                        <OPMLManager />
                    </SettingsItem>

                    <SettingsDivider>
                        <SettingsAction
                            label="Reset Application"
                            description="Permanently delete all podcasts, episodes, and playback progress"
                            actionLabel="Clear All Data"
                            loadingLabel="Clearing..."
                            onAction={handleClearAllData}
                            variant="destructive"
                            icon={Trash2}
                            disabled={podcasts.length === 0 || isClearingData}
                            loading={isClearingData}
                            confirmDialog={{
                                title: "Clear All Data",
                                description: `This action will permanently delete:\n• All podcast subscriptions (${podcasts.length} podcasts)\n• All downloaded episode information\n• All playback progress and history\n• All app preferences (except theme)\n\nThis action cannot be undone.`,
                                actionLabel: "Clear All Data",
                            }}
                        />
                    </SettingsDivider>
                </SettingsGroup>

                <div className="text-xs text-muted-foreground text-center">
                    Version {APP_VERSION} · Created by{" "}
                    <a
                        href="https://www.scchan.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        scchan
                    </a>{" "}
                    · View on{" "}
                    <a
                        href="https://github.com/sichengchen/progressive-cast"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </>
    );
}
