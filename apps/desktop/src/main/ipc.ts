import { ipcMain } from "electron";

import { ipcChannels } from "../shared/ipc";
import { DownloadService } from "./downloads";
import type { LocalDatabase } from "./db";
import { LibraryService } from "./library";
import { PlaybackService } from "./playback";
import { SettingsService } from "./settings";
import { SyncService } from "./sync";

export function registerIpcHandlers(db: LocalDatabase, downloadsDir: string): void {
  const downloads = new DownloadService(db, downloadsDir);
  const library = new LibraryService(db);
  const playback = new PlaybackService(db);
  const settings = new SettingsService(db);
  const sync = new SyncService(db);

  ipcMain.handle(ipcChannels.library.list, () => library.listPodcasts());
  ipcMain.handle(ipcChannels.library.subscribe, (_event, feedUrl: string) =>
    library.subscribe(feedUrl),
  );
  ipcMain.handle(ipcChannels.library.unsubscribe, (_event, podcastId: string) =>
    library.unsubscribe(podcastId),
  );
  ipcMain.handle(ipcChannels.library.refresh, (_event, podcastId: string) =>
    library.refresh(podcastId),
  );
  ipcMain.handle(ipcChannels.episodes.listByPodcast, (_event, podcastId: string) =>
    library.listEpisodesByPodcast(podcastId),
  );

  ipcMain.handle(ipcChannels.downloads.start, (_event, episodeId: string) =>
    downloads.start(episodeId),
  );
  ipcMain.handle(ipcChannels.downloads.delete, (_event, episodeId: string) =>
    downloads.delete(episodeId),
  );

  ipcMain.handle(ipcChannels.playback.getSource, (_event, episodeId: string) =>
    playback.getSource(episodeId),
  );
  ipcMain.handle(ipcChannels.playback.saveProgress, (_event, progress) =>
    playback.saveProgress(progress),
  );

  ipcMain.handle(ipcChannels.settings.get, () => settings.get());
  ipcMain.handle(ipcChannels.settings.set, (_event, nextSettings) => settings.set(nextSettings));

  ipcMain.handle(ipcChannels.sync.now, () => sync.syncNow());
}
