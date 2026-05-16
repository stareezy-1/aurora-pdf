import { useTransition } from "react";
import { useAuroraStore } from "@/stores/aurora.store";

export interface ProcessorOptions {
  process: (
    file: File,
    onProgress: (progress: number, label?: string) => void,
  ) => Promise<{ blob: Blob; filename: string }>;
}

export interface FileProcessorResult {
  isPending: boolean;
  run: (file: File) => void;
}

/**
 * Wraps useTransition around an engine function.
 * Progress is driven directly via updateProgress so the bar always moves.
 */
export function useFileProcessor(
  options: ProcessorOptions,
): FileProcessorResult {
  const { setNewFile, setComplete, failSession } = useAuroraStore();
  const [isPending, startTransition] = useTransition();

  function run(file: File): void {
    setNewFile(file);

    startTransition(async () => {
      try {
        const onProgress = (progress: number, label?: string) => {
          useAuroraStore.getState().updateProgress(progress, label);
        };
        const { blob, filename } = await options.process(file, onProgress);
        setComplete(blob, filename);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        failSession(message);
      }
    });
  }

  return { isPending, run };
}
