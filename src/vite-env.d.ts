/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORTFOLIO_APP_URL: string;
  readonly VITE_UI_APP_URL: string;
  /** Sentry DSN — leave empty to disable analytics */
  readonly VITE_SENTRY_DSN: string | undefined;
  /** App version string for Sentry release tracking */
  readonly VITE_APP_VERSION: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
