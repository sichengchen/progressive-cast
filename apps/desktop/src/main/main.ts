import { app, BrowserWindow, nativeImage } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createLocalDatabase } from "./db";
import { registerIpcHandlers } from "./ipc";

const mainDir =
  typeof __dirname === "string" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const appId = "com.scchan.rajio";
const legacyUserDataPath = path.join(app.getPath("appData"), "Newcastle");
const rendererDevServerUrl = process.env.NEWCASTLE_RENDERER_URL;
const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, "icon.png")
  : path.resolve(mainDir, "../../resources/icon.png");
const appIcon = nativeImage.createFromPath(appIconPath);

function createMainWindow(): BrowserWindow {
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
    window.show();
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
  registerIpcHandlers(db, path.join(app.getPath("userData"), "downloads"));
  createMainWindow();

  app.on("before-quit", () => {
    db.close();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
