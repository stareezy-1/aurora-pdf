import { useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";

export function useSwUpdate(): void {
  const setSwUpdate = useAuroraStore((s) => s.setSwUpdate);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.ready.then((registration) => {
      const handleUpdateFound = () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setSwUpdate(registration);
          }
        });
      };

      registration.addEventListener("updatefound", handleUpdateFound);
    });
  }, [setSwUpdate]);
}
