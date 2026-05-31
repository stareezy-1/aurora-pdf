/**
 * useRemoveMetadata — hook for the Remove Metadata tool.
 * Clear XMP + DocInfo, confirm zero fields remain, Worker processing.
 *
 * Requirements: 69.1, 69.2, 69.3, 69.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { removeMetadata } from "@/engines/security-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function useRemoveMetadata() {
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
  const [fieldsRemoved, setFieldsRemoved] = useState<number | null>(null);

  const processor = usePdfProcessor<Record<string, never>>({
    processFn: async (bytes, _config, onProgress) => {
      onProgress(10, "Loading PDF…");
      const result = await removeMetadata(bytes);
      onProgress(90, "Verifying…");
      setFieldsRemoved(result.fieldsRemoved);
      onProgress(100, "Done");
      return result.bytes;
    },
    outputSuffix: "no-metadata",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    setFieldsRemoved(null);
    processor.run(session.file, {});
  }, [session.file, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setFieldsRemoved(null);
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
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    fieldsRemoved,
    processor,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
