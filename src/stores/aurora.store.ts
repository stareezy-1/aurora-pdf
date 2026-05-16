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

  // Actions
  setNewFile: (file: File) => void;
  setComplete: (blob: Blob, filename: string) => void;
  updateProgress: (progress: number, label?: string) => void;
  failSession: (message: string) => void;
  toggleTheme: () => void;
  setToolConfig: (config: Partial<ToolConfig>) => void;
  resetToolConfig: () => void;
  clearWorkbox: () => void;
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

  setNewFile: (file) => {
    get().clearWorkbox();
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
}));
