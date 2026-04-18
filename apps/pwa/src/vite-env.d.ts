/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "*.css";

interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
