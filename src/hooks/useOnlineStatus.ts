import { useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";

export function useOnlineStatus(): void {
  const setOnline = useAuroraStore((s) => s.setOnline);

  useEffect(() => {
    // Sync initial state
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);
}
