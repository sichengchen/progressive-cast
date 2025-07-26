"use client"

import { useState, useEffect } from 'react';
import { Download, HardDrive, Trash2, PauseCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePodcastStore } from '@/lib/store';
import { DownloadService } from '@/lib/download-service';
import { DatabaseService } from '@/lib/database';
import { formatTime } from '@/lib/utils';
import type { Episode, DownloadProgress } from '@/lib/types';

export function DownloadManager() {
  const { storageStats, downloadProgress, refreshStorageStats, clearAllDownloads } = usePodcastStore();
  const [downloadedEpisodes, setDownloadedEpisodes] = useState<Episode[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<DownloadProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load downloaded episodes and active downloads
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [episodes, activeProgress] = await Promise.all([
          DatabaseService.getDownloadedEpisodes(),
          DatabaseService.getAllDownloadProgress()
        ]);
        
        setDownloadedEpisodes(episodes);
        setActiveDownloads(activeProgress.filter(p => p.status === 'downloading'));
        await refreshStorageStats();
      } catch (error) {
        console.error('Failed to load download data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [refreshStorageStats]);

  // Update active downloads when store changes
  useEffect(() => {
    const activeProgressArray = Array.from(downloadProgress.values())
      .filter(p => p.status === 'downloading');
    setActiveDownloads(activeProgressArray);
  }, [downloadProgress]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleClearAllDownloads = async () => {
    if (confirm('Are you sure you want to delete all downloaded episodes? This action cannot be undone.')) {
      await clearAllDownloads();
      setDownloadedEpisodes([]);
      setActiveDownloads([]);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    try {
      await DownloadService.deleteDownload(episodeId);
      setDownloadedEpisodes(prev => prev.filter(ep => ep.id !== episodeId));
      await refreshStorageStats();
    } catch (error) {
      console.error('Failed to delete episode:', error);
    }
  };

  const handleCancelDownload = async (episodeId: string) => {
    try {
      await DownloadService.cancelDownload(episodeId);
      setActiveDownloads(prev => prev.filter(p => p.episodeId !== episodeId));
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg"></div>
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
        <div className="h-40 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Storage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Usage
          </CardTitle>
          <CardDescription>
            Manage your downloaded episodes and storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Episodes</p>
              <p className="text-2xl font-semibold">{storageStats?.downloadedEpisodes || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Size</p>
              <p className="text-2xl font-semibold">
                {formatFileSize(storageStats?.totalSize || 0)}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleClearAllDownloads}
                disabled={!downloadedEpisodes.length}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Downloads
              </Button>
            </div>
          </div>

          {/* Storage quota warning */}
          {storageStats && storageStats.totalSize > 500 * 1024 * 1024 && (
            <div className="flex items-center gap-2 p-3 border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You&apos;re using over 500MB of storage. Consider removing some downloads to free up space.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Active Downloads ({activeDownloads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeDownloads.map((download) => {
                const episode = downloadedEpisodes.find(ep => ep.id === download.episodeId);
                return (
                  <div key={download.episodeId} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {episode?.title || `Episode ${download.episodeId}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={download.progress} className="flex-1 h-2" />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {download.progress}%
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelDownload(download.episodeId)}
                    >
                      <PauseCircle className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Downloaded Episodes */}
      <Card>
        <CardHeader>
          <CardTitle>Downloaded Episodes ({downloadedEpisodes.length})</CardTitle>
          <CardDescription>
            Episodes available for offline playback
          </CardDescription>
        </CardHeader>
        <CardContent>
          {downloadedEpisodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No episodes downloaded yet</p>
              <p className="text-sm mt-1">Download episodes from the podcast view to play them offline</p>
            </div>
          ) : (
            <div className="space-y-2">
              {downloadedEpisodes.map((episode, index) => (
                <div key={episode.id}>
                  <div className="flex items-center gap-4 p-3 hover:bg-accent rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{episode.title}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {episode.duration && (
                          <span className="flex items-center gap-1">
                            <PlayCircle className="w-3 h-3" />
                            {formatTime(episode.duration)}
                          </span>
                        )}
                        {episode.fileSize && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatFileSize(episode.fileSize)}
                          </span>
                        )}
                        {episode.downloadedAt && (
                          <span>
                            Downloaded {new Date(episode.downloadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEpisode(episode.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {index < downloadedEpisodes.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 