/**
 * usePdfToText — hook for the PDF to Text tool.
 * Page range input, Worker extraction, .txt download.
 * Requirements: 46.1, 46.2, 46.3, 46.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";
import { pdfToText } from "@/engines/conversion-engine";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function usePdfToText() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });

  const [pageRange, setPageRange] = useState("");
  const [isPending, setIsPending] = useState(false);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    setIsPending(true);
    setNewFile(session.file);

    try {
      const text = await pdfToText(
        session.bytes,
        pageRange || undefined,
        session.pageCount,
        (pct, label) => updateProgress(pct, label),
      );

      const blob = new Blob([text], { type: "text/plain" });
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(blob, `${base}.txt`);
    } catch (err) {
      failSession(
        err instanceof Error ? err.message : "Text extraction failed.",
      );
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    session.pageCount,
    pageRange,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setPageRange("");
    setIsPending(false);
  }, [session]);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    file: session.file,
    pageCount: session.pageCount,
    preview: session.preview,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    pageRange,
    setPageRange,
    isPending,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
