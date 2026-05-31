import { useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";

/**
 * Handles PWA service-worker update lifecycle.
 *
 * With skipWaiting: true + clientsClaim: true in the workbox config, the new
 * SW activates immediately after installation. When it does, the browser fires
 * a "controllerchange" event on navigator.serviceWorker. We listen for that
 * event and reload the page so users always get the latest build without
 * needing to manually clear storage.
 *
 * We also keep the "updatefound" path so the UpdateNotification banner can
 * show briefly before the reload happens (gives users a visual cue).
 */
export function useSwUpdate(): void {
  const setSwUpdate = useAuroraStore((s) => s.setSwUpdate);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // When the active SW changes (new SW took over via skipWaiting + clientsClaim),
    // reload the page to load the fresh assets from the new cache.
    let reloading = false;
    const handleControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    // Also watch for a new SW installing so we can show the update banner
    // (the banner will be visible briefly before the reload fires).
    void navigator.serviceWorker.ready.then((registration) => {
      const handleUpdateFound = () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Signal the store so the UpdateNotification banner appears.
            // With skipWaiting: true the new SW will call skipWaiting
            // automatically, triggering controllerchange → reload above.
            setSwUpdate(registration);
          }
        });
      };

      registration.addEventListener("updatefound", handleUpdateFound);

      // Trigger an immediate update check on mount so long-lived tabs
      // pick up a new SW without waiting for the next navigation.
      void registration.update().catch(() => {
        // Ignore network errors during update check (e.g. offline)
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, [setSwUpdate]);
}
