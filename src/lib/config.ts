/** Centralised runtime config — values injected by Vite from .env / Vercel env vars */
export const config = {
  portfolioAppUrl:
    import.meta.env.VITE_PORTFOLIO_APP_URL || "https://stareezy.tech/",
  uiAppUrl: import.meta.env.VITE_UI_APP_URL || "https://ui.stareezy.tech/",
} as const;
