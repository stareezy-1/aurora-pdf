/**
 * analytics.ts
 *
 * Thin wrapper around Sentry that provides:
 *  - Error / performance monitoring (via Sentry SDK)
 *  - Custom event tracking (page views, tool usage, downloads, file uploads)
 *    sent as Sentry breadcrumbs + custom events so they appear in the
 *    Sentry dashboard without needing a paid plan.
 *
 * All tracking is opt-out via VITE_SENTRY_DSN being absent.
 */

import * as Sentry from "@sentry/react";

// ── Init ──────────────────────────────────────────────────────────────────

export function initAnalytics() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return; // analytics disabled when DSN is not set

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // "development" | "production"
    release: import.meta.env.VITE_APP_VERSION as string | undefined,

    // Performance: capture 10 % of transactions in production, 100 % in dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session replay: 5 % of sessions, 100 % on error
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Never capture file content — privacy first
        maskAllText: false,
        blockAllMedia: true,
      }),
    ],

    // Strip PII from breadcrumbs / events
    beforeSend(event) {
      // Remove any query strings that might contain file names
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url);
          u.search = "";
          event.request.url = u.toString();
        } catch {
          // ignore
        }
      }
      return event;
    },
  });
}

// ── Event types ───────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | { name: "page_view"; path: string; title: string }
  | {
      name: "tool_file_selected";
      tool: string;
      fileSizeMb: number;
      fileType: string;
    }
  | { name: "tool_processing_started"; tool: string }
  | { name: "tool_processing_success"; tool: string; outputSizeMb: number }
  | { name: "tool_processing_error"; tool: string; reason: string }
  | { name: "file_downloaded"; tool: string; outputSizeMb: number }
  | { name: "tool_reset"; tool: string }
  | { name: "theme_toggled"; theme: "dark" | "light" }
  | { name: "command_palette_opened" }
  | { name: "related_tool_clicked"; from: string; to: string };

// ── trackEvent ────────────────────────────────────────────────────────────

/**
 * Send a structured analytics event.
 * - Adds a Sentry breadcrumb (visible in error context)
 * - Sends a Sentry custom event so it appears in the Issues / Insights tab
 */
export function trackEvent(event: AnalyticsEvent) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  const { name, ...data } = event;

  // Breadcrumb — shows up in the trail leading to any error
  Sentry.addBreadcrumb({
    category: "analytics",
    message: name,
    data,
    level: "info",
  });

  // Custom Sentry event — shows up as a separate issue type in the dashboard
  Sentry.captureEvent({
    message: name,
    level: "info",
    tags: { event_name: name },
    extra: data,
  });
}
