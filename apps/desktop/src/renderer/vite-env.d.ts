/// <reference types="vite/client" />

import type { NewcastleApi } from "../shared/ipc";

declare const __APP_VERSION__: string;

declare global {
  interface Window {
    newcastle?: NewcastleApi;
  }
}
