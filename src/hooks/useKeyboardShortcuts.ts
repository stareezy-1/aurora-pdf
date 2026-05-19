import { useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";

/**
 * Registers global keyboard shortcuts on the window keydown event.
 *
 * Shortcuts:
 *   Escape           → close any open modal (command palette, shortcut panel)
 *   ?                → toggle keyboard shortcut panel (when not in input/textarea)
 *   Ctrl+S / Cmd+S   → trigger download when status === 'success'
 *   Ctrl+Z / Cmd+Z   → undo (dispatches aurora:undo event)
 *   Ctrl+Shift+Z / Cmd+Shift+Z → redo (dispatches aurora:redo event)
 *   Delete / Backspace → remove selected editor item (when not in input/textarea)
 *
 * Requirements: 7.1–7.7
 */
export function useKeyboardShortcuts(): void {
  const status = useAuroraStore((s) => s.status);
  const closeCommandPalette = useAuroraStore((s) => s.closeCommandPalette);
  const shortcutPanelOpen = useAuroraStore((s) => s.shortcutPanelOpen);
  const toggleShortcutPanel = useAuroraStore((s) => s.toggleShortcutPanel);
  const popUndo = useAuroraStore((s) => s.popUndo);
  const popRedo = useAuroraStore((s) => s.popRedo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      // Escape — close any open modal
      if (e.key === "Escape") {
        closeCommandPalette();
        if (shortcutPanelOpen) {
          toggleShortcutPanel();
        }
        return;
      }

      // ? — toggle shortcut panel (not in input/textarea)
      if (e.key === "?" && !inInput) {
        toggleShortcutPanel();
        return;
      }

      // Ctrl+S / Cmd+S — download when success
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        if (status === "success") {
          window.dispatchEvent(new CustomEvent("aurora:download"));
        }
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z — redo (must be checked before Ctrl+Z)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        popRedo();
        window.dispatchEvent(new CustomEvent("aurora:redo"));
        return;
      }

      // Ctrl+Z / Cmd+Z — undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        popUndo();
        window.dispatchEvent(new CustomEvent("aurora:undo"));
        return;
      }

      // Delete / Backspace — remove selected editor item (not in input/textarea)
      if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
        window.dispatchEvent(new CustomEvent("aurora:delete-selected"));
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    status,
    closeCommandPalette,
    shortcutPanelOpen,
    toggleShortcutPanel,
    popUndo,
    popRedo,
  ]);
}
