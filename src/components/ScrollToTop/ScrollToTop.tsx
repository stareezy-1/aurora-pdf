import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Scrolls the window to the top on every route change.
 * Render this once inside the router (e.g. in the app shell or router config).
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
