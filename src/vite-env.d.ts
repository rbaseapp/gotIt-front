/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CORE_API_URL?: string;
  readonly VITE_GOTIT_API_URL?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
