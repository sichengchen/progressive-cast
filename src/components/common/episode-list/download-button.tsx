"use client";

import { useState, useEffect } from "react";
import {
    Download,
    CheckCircle,
    AlertCircle,
    X,
    RotateCcw,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DownloadService } from "@/lib/download-service";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Episode, DownloadProgress } from "@/lib/types";

interface DownloadButtonProps {
    episode: Episode;
    className?: string;
    showProgress?: boolean;
    size?: "sm" | "default" | "lg";
    pageType?: "podcast" | "downloaded" | "other";
    onDownloadComplete?: () => void;
    onDeleteComplete?: () => void;
}

export function DownloadButton({
    episode,
    className = "",
    showProgress = true,
    size = "sm",
    pageType = "other",
    onDownloadComplete,
    onDeleteComplete,
}: DownloadButtonProps) {
    const [downloadProgress, setDownloadProgress] =
        useState<DownloadProgress | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useIsMobile();

    // Subscribe to download progress
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const initializeProgress = async () => {
            // Get current progress if any
            const currentProgress = await DownloadService.getDownloadStatus(
                episode.id
            );
            setDownloadProgress(currentProgress);

            // Subscribe to updates
            unsubscribe = DownloadService.onProgress(episode.id, (progress) => {
                setDownloadProgress(progress);

                // Auto-refresh when download completes
                if (progress.status === "completed" && onDownloadComplete) {
                    // Small delay to ensure DB updates are complete
                    setTimeout(() => {
                        onDownloadComplete();
                    }, 500);
                }
            });
        };

        initializeProgress();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [episode.id, onDownloadComplete]);

    const handleDownload = async () => {
        try {
            setIsLoading(true);
            await DownloadService.queueDownload(episode);
        } catch (error) {
            console.error("Failed to queue download:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async () => {
        try {
            setIsLoading(true);
            await DownloadService.cancelDownload(episode.id);
            setDownloadProgress(null);
        } catch (error) {
            console.error("Failed to cancel download:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        try {
            setIsLoading(true);
            await DownloadService.deleteDownload(episode.id);
            setDownloadProgress(null);
            setShowDeleteDialog(false);

            // Auto-refresh when deletion completes
            if (onDeleteComplete) {
                // Small delay to ensure DB updates are complete
                setTimeout(() => {
                    onDeleteComplete();
                }, 300);
            }
        } catch (error) {
            console.error("Failed to delete download:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleDialogCancel = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setShowDeleteDialog(false);
    };

    const handleRetry = async () => {
        try {
            setIsLoading(true);
            await DownloadService.retryDownload(episode);
        } catch (error) {
            console.error("Failed to retry download:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getButtonContent = () => {
        // On downloaded page, only show delete functionality
        if (pageType === "downloaded") {
            if (episode.isDownloaded) {
                const showTrashIcon = isMobile || isHovered;
                return {
                    icon: showTrashIcon ? (
                        <Trash2 className="w-4 h-4 text-destructive" />
                    ) : (
                        <CheckCircle className="w-4 h-4" />
                    ),
                    tooltip: isMobile
                        ? "Downloaded - Click to remove"
                        : isHovered
                        ? "Downloaded - Click to remove"
                        : "Downloaded",
                    action: handleDeleteClick,
                    variant: "ghost" as const,
                    className: showTrashIcon
                        ? "text-destructive"
                        : "text-green-600",
                };
            }
            // If not downloaded on downloaded page, don't show anything
            return null;
        }

        // On podcast page, show download functionality
        if (pageType === "podcast") {
            if (episode.isDownloaded) {
                // On podcast page, just show downloaded status, no delete button
                return {
                    icon: <CheckCircle className="w-4 h-4" />,
                    tooltip: "Downloaded",
                    action: () => {}, // No action on podcast page for downloaded episodes
                    variant: "ghost" as const,
                    className: "text-green-600",
                };
            }

            if (downloadProgress?.status === "downloading") {
                return {
                    icon: <X className="w-4 h-4" />,
                    tooltip: `Downloading ${downloadProgress.progress}% - Click to cancel`,
                    action: handleCancel,
                    variant: "ghost" as const,
                    className: "text-blue-600 hover:text-red-600",
                };
            }

            if (downloadProgress?.status === "failed") {
                return {
                    icon: <RotateCcw className="w-4 h-4" />,
                    tooltip: `Download failed: ${
                        downloadProgress.error || "Unknown error"
                    } - Click to retry`,
                    action: handleRetry,
                    variant: "ghost" as const,
                    className: "text-red-600 hover:text-blue-600",
                };
            }

            return {
                icon: <Download className="w-4 h-4" />,
                tooltip: "Download for offline playback",
                action: handleDownload,
                variant: "ghost" as const,
                className: "text-muted-foreground hover:text-primary",
            };
        }

        // On other pages, don't show download/delete buttons
        return null;
    };

    const buttonContent = getButtonContent();

    // Don't render if no button content (for other pages)
    if (!buttonContent) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={buttonContent.variant}
                            size={size}
                            onClick={(e) => {
                                e.stopPropagation();
                                buttonContent.action();
                            }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            disabled={isLoading}
                            className={`${className} ${buttonContent.className}`}
                        >
                            {buttonContent.icon}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{buttonContent.tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete Downloaded Episode
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this downloaded
                            episode? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleDialogCancel}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Progress bar for active downloads */}
            {showProgress && downloadProgress?.status === "downloading" && (
                <div className="w-full max-w-[60px]">
                    <Progress
                        value={downloadProgress.progress}
                        className="h-1"
                    />
                    <div className="text-xs text-center text-muted-foreground mt-1">
                        {downloadProgress.progress}%
                    </div>
                </div>
            )}

            {/* Error indicator */}
            {downloadProgress?.status === "failed" && (
                <AlertCircle className="w-3 h-3 text-red-500" />
            )}
        </div>
    );
}
