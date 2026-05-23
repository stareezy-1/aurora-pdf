/**
 * usePageAnalytics
 *
 * Fires a `page_view` event every time the route changes.
 * Mount once in RootLayout — it subscribes to React Router's location.
 */

import { useEffect } from "react";
import { useLocation } from "react-router";
import { trackEvent } from "@/lib/analytics";

export function usePageAnalytics() {
  const location = useLocation();

  useEffect(() => {
    trackEvent({
      name: "page_view",
      path: location.pathname,
      title: document.title,
    });
  }, [location.pathname]);
}
