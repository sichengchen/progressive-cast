/// <reference types="vite/client" />

import type { NewcastleApi } from "../shared/ipc";

declare global {
  interface Window {
    newcastle: NewcastleApi;
  }
}
