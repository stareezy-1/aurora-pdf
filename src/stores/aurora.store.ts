import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { SessionStatus, Theme } from "@/types/store.types";
import { type ToolConfig, defaultToolConfig } from "@/types/tool.types";

interface AuroraStore {
  // State
  activeFile: File | null;
  resultBlobUrl: string | null;
  status: SessionStatus;
  progress: number;
  progressLabel: string;
  sessionId: string;
  errorMessage: string | null;
  outputFilename: string | null;
  theme: Theme;
  toolConfig: ToolConfig;

  // Online/offline
  isOnline: boolean;

  // Command palette
  commandPaletteOpen: boolean;

  // Keyboard shortcut panel
  shortcutPanelOpen: boolean;

  // SW update
  swUpdateAvailable: boolean;
  swRegistration: ServiceWorkerRegistration | null;

  // Editor undo/redo (per-session, not persisted)
  undoStack: unknown[];
  redoStack: unknown[];

  // Recent file (persisted to sessionStorage)
  recentFile: { name: string; size: number } | null;

  // Actions
  setNewFile: (file: File) => void;
  setComplete: (blob: Blob, filename: string) => void;
  updateProgress: (progress: number, label?: string) => void;
  failSession: (message: string) => void;
  toggleTheme: () => void;
  setToolConfig: (config: Partial<ToolConfig>) => void;
  resetToolConfig: () => void;
  clearWorkbox: () => void;

  // Online/offline actions
  setOnline: (online: boolean) => void;

  // Command palette actions
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  // Keyboard shortcut panel actions
  toggleShortcutPanel: () => void;

  // SW update actions
  setSwUpdate: (reg: ServiceWorkerRegistration) => void;
  dismissSwUpdate: () => void;

  // Undo/redo actions
  pushUndo: (payload: unknown) => void;
  popUndo: () => unknown | undefined;
  pushRedo: (payload: unknown) => void;
  popRedo: () => unknown | undefined;
  clearUndoRedo: () => void;

  // Recent file actions
  setRecentFile: (file: { name: string; size: number }) => void;
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem("aurora-pdf-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (SSR / private browsing)
  }
  return "dark";
}

function readRecentFile(): { name: string; size: number } | null {
  try {
    const raw = sessionStorage.getItem("aurora-recent-file");
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        "name" in parsed &&
        "size" in parsed &&
        typeof (parsed as { name: unknown }).name === "string" &&
        typeof (parsed as { size: unknown }).size === "number"
      ) {
        return parsed as { name: string; size: number };
      }
    }
  } catch {
    // sessionStorage unavailable or JSON parse error
  }
  return null;
}

export const useAuroraStore = create<AuroraStore>((set, get) => ({
  activeFile: null,
  resultBlobUrl: null,
  status: "idle",
  progress: 0,
  progressLabel: "",
  sessionId: uuidv4(),
  errorMessage: null,
  outputFilename: null,
  theme: readTheme(),
  toolConfig: defaultToolConfig,

  // Online/offline — initialised from navigator.onLine
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,

  // Command palette
  commandPaletteOpen: false,

  // Keyboard shortcut panel
  shortcutPanelOpen: false,

  // SW update
  swUpdateAvailable: false,
  swRegistration: null,

  // Editor undo/redo (per-session, not persisted)
  undoStack: [],
  redoStack: [],

  // Recent file — initialised from sessionStorage
  recentFile: readRecentFile(),

  setNewFile: (file) => {
    get().clearWorkbox();
    get().setRecentFile({ name: file.name, size: file.size });
    set({
      activeFile: file,
      status: "processing",
      progress: 0,
      progressLabel: "Starting…",
      sessionId: uuidv4(),
    });
  },

  setComplete: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    set({ resultBlobUrl: url, outputFilename: filename, status: "success" });
  },

  updateProgress: (progress, label) => {
    set({
      progress: Math.min(100, Math.max(0, progress)),
      progressLabel: label ?? "",
    });
  },

  failSession: (message) => {
    get().clearWorkbox();
    set({ status: "error", errorMessage: message });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("aurora-pdf-theme", next);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("data-theme", next);
    set({ theme: next });
  },

  setToolConfig: (config) =>
    set((s) => ({ toolConfig: { ...s.toolConfig, ...config } })),

  resetToolConfig: () => set({ toolConfig: defaultToolConfig }),

  clearWorkbox: () => {
    const { resultBlobUrl } = get();
    if (resultBlobUrl) {
      URL.revokeObjectURL(resultBlobUrl);
    }
    set({
      activeFile: null,
      resultBlobUrl: null,
      status: "idle",
      progress: 0,
      progressLabel: "",
      errorMessage: null,
      outputFilename: null,
    });
  },

  // Online/offline actions
  setOnline: (online) => set({ isOnline: online }),

  // Command palette actions
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  // Keyboard shortcut panel actions
  toggleShortcutPanel: () =>
    set((s) => ({ shortcutPanelOpen: !s.shortcutPanelOpen })),

  // SW update actions
  setSwUpdate: (reg) => set({ swUpdateAvailable: true, swRegistration: reg }),
  dismissSwUpdate: () =>
    set({ swUpdateAvailable: false, swRegistration: null }),

  // Undo/redo actions
  pushUndo: (payload) => set((s) => ({ undoStack: [...s.undoStack, payload] })),
  popUndo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;
    const payload = undoStack[undoStack.length - 1];
    set({ undoStack: undoStack.slice(0, -1) });
    return payload;
  },
  pushRedo: (payload) => set((s) => ({ redoStack: [...s.redoStack, payload] })),
  popRedo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return undefined;
    const payload = redoStack[redoStack.length - 1];
    set({ redoStack: redoStack.slice(0, -1) });
    return payload;
  },
  clearUndoRedo: () => set({ undoStack: [], redoStack: [] }),

  // Recent file actions
  setRecentFile: (file) => {
    try {
      sessionStorage.setItem("aurora-recent-file", JSON.stringify(file));
    } catch {
      /* sessionStorage unavailable */
    }
    set({ recentFile: file });
  },
}));
