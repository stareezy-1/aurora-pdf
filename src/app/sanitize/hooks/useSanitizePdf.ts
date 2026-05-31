/**
 * useSanitizePdf — hook for the Sanitize PDF tool.
 * Removal summary before download, Worker processing.
 *
 * Requirements: 68.1, 68.2, 68.3, 68.4, 68.5, 68.6
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { sanitizePdf } from "@/engines/security-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import type { SanitizeResult } from "@/engines/security-engine";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function useSanitizePdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT });
  const [sanitizeStats, setSanitizeStats] = useState<Omit<
    SanitizeResult,
    "bytes"
  > | null>(null);

  const processor = usePdfProcessor<Record<string, never>>({
    processFn: async (bytes, _config, onProgress) => {
      const result = await sanitizePdf(bytes, onProgress);
      setSanitizeStats({
        removedMetadata: result.removedMetadata,
        removedAnnotations: result.removedAnnotations,
        removedJavaScript: result.removedJavaScript,
        removedAttachments: result.removedAttachments,
      });
      return result.bytes;
    },
    outputSuffix: "sanitized",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    setSanitizeStats(null);
    processor.run(session.file, {});
  }, [session.file, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setSanitizeStats(null);
  }, [session]);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    file: session.file,
    pageCount: session.pageCount,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    sanitizeStats,
    processor,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
