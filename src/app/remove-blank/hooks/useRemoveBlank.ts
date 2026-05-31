/**
 * useRemoveBlank — hook for the Remove Blank Pages tool.
 * Threshold slider, detected pages list with thumbnails, deselect before removal.
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import {
  detectBlankPages,
  removeBlankPages,
} from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const DEFAULT_THRESHOLD = 0.99;

export function useRemoveBlank() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({
    accept: PDF_ACCEPT,
    generateAllPreviews: true,
  });

  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [detectedPages, setDetectedPages] = useState<number[] | null>(null);
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<number>>(
    new Set(),
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const processor = usePdfProcessor<{ indices: number[] }>({
    processFn: async (bytes, { indices }) => {
      const result = await removeBlankPages(bytes, threshold, indices);
      return result.bytes;
    },
    outputSuffix: "no-blanks",
  });

  const handleDetect = useCallback(async () => {
    if (!session.bytes) return;
    setIsDetecting(true);
    setDetectError(null);
    try {
      const indices = await detectBlankPages(session.bytes, threshold);
      setDetectedPages(indices);
      setSelectedForRemoval(new Set(indices));
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : "Detection failed.");
    } finally {
      setIsDetecting(false);
    }
  }, [session.bytes, threshold]);

  const togglePage = useCallback((pageIndex: number) => {
    setSelectedForRemoval((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return next;
    });
  }, []);

  const handleRemove = useCallback(() => {
    if (!session.file || selectedForRemoval.size === 0) return;
    processor.run(session.file, { indices: Array.from(selectedForRemoval) });
  }, [session.file, selectedForRemoval, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setDetectedPages(null);
    setSelectedForRemoval(new Set());
    setDetectError(null);
    setThreshold(DEFAULT_THRESHOLD);
  }, [session]);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    file: session.file,
    bytes: session.bytes,
    pageCount: session.pageCount,
    allPreviews: session.allPreviews,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    threshold,
    setThreshold,
    detectedPages,
    selectedForRemoval,
    togglePage,
    isDetecting,
    detectError,
    handleDetect,
    handleRemove,
    handleReset,
    PDF_ACCEPT,
  };
}
