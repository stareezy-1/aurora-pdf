import { useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";

export function useCommandPalette() {
  const open = useAuroraStore((s) => s.commandPaletteOpen);
  const openPalette = useAuroraStore((s) => s.openCommandPalette);
  const closePalette = useAuroraStore((s) => s.closeCommandPalette);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, openPalette, closePalette]);

  return { open, openPalette, closePalette };
}
