/**
 * usePdfProcessor — shared hook for Worker lifecycle management, progress
 * tracking, cancel support, and result blob management.
 *
 * Design principles:
 * - The Worker is created once per session (on first `run` call) and reused
 *   for subsequent runs with the same file/config.
 * - Calling `cancel` terminates the current Worker and clears pending state.
 * - Calling `reset` (via useFileSession) also terminates the Worker.
 * - The result blob URL is managed here and revoked when a new run starts or
 *   when the component unmounts.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 21.3, 21.4
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";

export interface PdfProcessorOptions<TConfig> {
  /**
   * The processing function. Runs on the main thread (wrapped in a
   * non-blocking transition). For heavy operations, callers should pass a
   * function that delegates to a Web Worker internally.
   *
   * @param bytes    Raw bytes of the input PDF.
   * @param config   Tool-specific configuration.
   * @param onProgress  Progress callback (0–100, optional label).
   * @returns        Output bytes (PDF or other format).
   */
  processFn: (
    bytes: Uint8Array,
    config: TConfig,
    onProgress: (pct: number, label?: string) => void,
  ) => Promise<Uint8Array>;

  /**
   * Suffix appended to the output filename, e.g. `"compressed"` → `"doc_compressed.pdf"`.
   * Falls back to `buildOutputFilename` when the suffix matches a known ToolName;
   * otherwise appends `_${outputSuffix}.pdf` directly.
   */
  outputSuffix: string;

  /** Output MIME type. Defaults to `"application/pdf"`. */
  outputMime?: string;
}

export interface PdfProcessorResult<TConfig> {
  /**
   * Start processing. Reads bytes from the provided File, calls processFn,
   * and stores the result blob URL in the aurora store.
   */
  run: (file: File, config: TConfig) => void;

  /**
   * Cancel an in-progress run. Terminates the internal abort controller so
   * the processFn promise is abandoned (the function itself must honour the
   * signal if it wants to stop early — this hook stops tracking the result).
   */
  cancel: () => void;

  /** True while a run is in progress. */
  isPending: boolean;
}

export function usePdfProcessor<TConfig>(
  opts: PdfProcessorOptions<TConfig>,
): PdfProcessorResult<TConfig> {
  const { processFn, outputSuffix, outputMime = "application/pdf" } = opts;

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const [isPending, setIsPending] = useState(false);

  // AbortController lets us abandon a stale run without crashing
  const abortRef = useRef<AbortController | null>(null);

  // Track the current result blob URL so we can revoke it before creating a new one
  const resultUrlRef = useRef<string | null>(null);

  // Revoke the previous result blob URL to avoid memory leaks
  const revokePreviousResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  // Revoke on unmount
  useEffect(() => {
    return () => {
      revokePreviousResult();
    };
  }, [revokePreviousResult]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsPending(false);
  }, []);

  const run = useCallback(
    (file: File, config: TConfig) => {
      // Cancel any in-flight run
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      revokePreviousResult();
      setNewFile(file);
      setIsPending(true);

      // Build output filename
      const dotIndex = file.name.lastIndexOf(".");
      const base = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name;
      const outputFilename = `${base}_${outputSuffix}${
        outputMime === "application/pdf" ? ".pdf" : ""
      }`;

      (async () => {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());

          // Bail out if cancelled before we even started processing
          if (controller.signal.aborted) return;

          const onProgress = (pct: number, label?: string) => {
            // Don't update progress if this run was cancelled
            if (!controller.signal.aborted) {
              updateProgress(pct, label);
            }
          };

          const resultBytes = await processFn(bytes, config, onProgress);

          // Bail out if cancelled while processing
          if (controller.signal.aborted) return;

          const blob = new Blob([resultBytes as unknown as BlobPart], {
            type: outputMime,
          });
          const url = URL.createObjectURL(blob);
          resultUrlRef.current = url;

          setComplete(blob, outputFilename);
        } catch (err) {
          // Ignore errors from cancelled runs
          if (controller.signal.aborted) return;

          const message =
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.";
          failSession(message);
        } finally {
          // Only clear pending state if this is still the active run
          if (abortRef.current === controller) {
            abortRef.current = null;
            setIsPending(false);
          }
        }
      })();
    },
    [
      processFn,
      outputSuffix,
      outputMime,
      setNewFile,
      updateProgress,
      setComplete,
      failSession,
      revokePreviousResult,
    ],
  );

  return { run, cancel, isPending };
}
