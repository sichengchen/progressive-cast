"use client"

import { DownloadManager } from '../../common/download-manager';

export function DownloadedPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-3 my-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Downloaded Episodes</h1>
          <p className="text-muted-foreground mt-2">
            Manage your downloaded episodes for offline playback
          </p>
        </div>

        <DownloadManager />
      </div>
    </div>
  );
} 