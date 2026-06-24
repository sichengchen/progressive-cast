import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createLocalDatabase } from "./db";
import { registerIpcHandlers } from "./ipc";

const mainDir =
  typeof __dirname === "string" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const appId = "com.scchan.newcastle";
const rendererDevServerUrl = process.env.NEWCASTLE_RENDERER_URL;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    height: 860,
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: "Newcastle",
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

app.setName("Newcastle");
app.setAppUserModelId(appId);

app.whenReady().then(() => {
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
