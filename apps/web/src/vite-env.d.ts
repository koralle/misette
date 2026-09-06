/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_BETTER_AUTH_URL: string;
  }
}

export type WebImportMetaEnv = ImportMetaEnv;
