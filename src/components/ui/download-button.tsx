"use client"

import { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { DownloadService } from '@/lib/download-service';
import type { Episode, DownloadProgress } from '@/lib/types';

interface DownloadButtonProps {
  episode: Episode;
  className?: string;
  showProgress?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function DownloadButton({ episode, className = '', showProgress = true, size = 'sm' }: DownloadButtonProps) {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to download progress
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeProgress = async () => {
      // Get current progress if any
      const currentProgress = await DownloadService.getDownloadStatus(episode.id);
      setDownloadProgress(currentProgress);

      // Subscribe to updates
      unsubscribe = DownloadService.onProgress(episode.id, (progress) => {
        setDownloadProgress(progress);
      });
    };

    initializeProgress();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [episode.id]);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      await DownloadService.queueDownload(episode);
    } catch (error) {
      console.error('Failed to queue download:', error);
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
      console.error('Failed to cancel download:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await DownloadService.deleteDownload(episode.id);
      setDownloadProgress(null);
    } catch (error) {
      console.error('Failed to delete download:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      setIsLoading(true);
      await DownloadService.retryDownload(episode);
    } catch (error) {
      console.error('Failed to retry download:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (episode.isDownloaded) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        tooltip: 'Downloaded - Click to remove',
        action: handleDelete,
        variant: 'default' as const,
        className: 'text-green-600 hover:text-red-600'
      };
    }

    if (downloadProgress?.status === 'downloading') {
      return {
        icon: <X className="w-4 h-4" />,
        tooltip: `Downloading ${downloadProgress.progress}% - Click to cancel`,
        action: handleCancel,
        variant: 'outline' as const,
        className: 'text-blue-600 hover:text-red-600'
      };
    }

    if (downloadProgress?.status === 'failed') {
      return {
        icon: <RotateCcw className="w-4 h-4" />,
        tooltip: `Download failed: ${downloadProgress.error || 'Unknown error'} - Click to retry`,
        action: handleRetry,
        variant: 'outline' as const,
        className: 'text-red-600 hover:text-blue-600'
      };
    }

    return {
      icon: <Download className="w-4 h-4" />,
      tooltip: 'Download for offline playback',
      action: handleDownload,
      variant: 'ghost' as const,
      className: 'text-muted-foreground hover:text-primary'
    };
  };

  const buttonContent = getButtonContent();

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

      {/* Progress bar for active downloads */}
      {showProgress && downloadProgress?.status === 'downloading' && (
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
      {downloadProgress?.status === 'failed' && (
        <AlertCircle className="w-3 h-3 text-red-500" />
      )}
    </div>
  );
} 