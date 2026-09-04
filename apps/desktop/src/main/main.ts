import { app, BrowserWindow, nativeImage, protocol } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createLocalDatabase } from "./db";
import { imageCacheScheme, registerImageCacheProtocol } from "./image-protocol";
import { registerIpcHandlers } from "./ipc";
import { resolveDefaultDownloadDirectory } from "./settings";

const mainDir =
  typeof __dirname === "string" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const appId = "com.scchan.rajio";
const legacyUserDataPath = path.join(app.getPath("appData"), "Newcastle");
const rendererDevServerUrl = process.env.NEWCASTLE_RENDERER_URL;
const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, "icon.png")
  : path.resolve(mainDir, "../../resources/icon.png");
const appIcon = nativeImage.createFromPath(appIconPath);
const startupEpisodeArtworkLimit = 24;

protocol.registerSchemesAsPrivileged([
  {
    privileges: {
      corsEnabled: true,
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
    scheme: imageCacheScheme,
  },
]);

function createMainWindow(artworkReady: Promise<unknown> = Promise.resolve()): BrowserWindow {
  const window = new BrowserWindow({
    height: 860,
    icon: appIcon,
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: "Rajio",
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 18, y: 18 },
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(mainDir, "../preload/index.cjs"),
      sandbox: false,
    },
    width: 1280,
  });

  window.once("ready-to-show", () => {
    void artworkReady.finally(() => {
      if (!window.isDestroyed()) {
        window.show();
      }
    });
  });

  if (rendererDevServerUrl) {
    void window.loadURL(rendererDevServerUrl);
  } else {
    void window.loadFile(path.join(mainDir, "../renderer/index.html"));
  }

  return window;
}

app.setName("Rajio");
if (existsSync(legacyUserDataPath)) {
  app.setPath("userData", legacyUserDataPath);
}
app.setAppUserModelId(appId);

app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon);
  }

  const db = createLocalDatabase(app.getPath("userData"));
  const imageCache = registerImageCacheProtocol(
    path.join(app.getPath("userData"), "image-cache-v1"),
  );
  const podcasts = db.listPodcasts();
  const episodes = db.listEpisodes();
  const startupArtworkUrls = uniqueArtworkUrls([
    ...podcasts.map((podcast) => podcast.imageUrl),
    ...db
      .listLatestEpisodes({ limit: startupEpisodeArtworkLimit })
      .episodes.map((episode) => episode.imageUrl),
  ]);
  const allArtworkUrls = uniqueArtworkUrls([
    ...podcasts.map((podcast) => podcast.imageUrl),
    ...episodes.map((episode) => episode.imageUrl),
  ]);
  const startupArtworkReady = imageCache.warm(startupArtworkUrls);

  void startupArtworkReady.then(() => imageCache.warm(allArtworkUrls));
  const defaultDownloadDirectory = resolveDefaultDownloadDirectory(
    process.platform,
    app.getName(),
    app.getPath("appData"),
    app.getPath("downloads"),
  );
  registerIpcHandlers(db, defaultDownloadDirectory);
  createMainWindow(startupArtworkReady);

  app.on("before-quit", () => {
    db.close();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

function uniqueArtworkUrls(urls: Array<string | undefined>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
