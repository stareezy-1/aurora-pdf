/**
 * usePdfToPng — hook for the PDF to PNG tool.
 * DPI selector, page range input, Worker conversion, ZIP download.
 * Requirements: 44.1, 44.2, 44.3, 44.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";
import { pdfToPng } from "@/engines/conversion-engine";
import { packageFilesAsZip } from "@/lib/zip-helper";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function usePdfToPng() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });

  const [dpi, setDpi] = useState<72 | 96 | 150 | 300>(150);
  const [pageRange, setPageRange] = useState("");
  const [isPending, setIsPending] = useState(false);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    setIsPending(true);
    setNewFile(session.file);

    try {
      const results = await pdfToPng(
        session.bytes,
        dpi,
        pageRange || undefined,
        session.pageCount,
        (pct, label) => updateProgress(pct, label),
      );

      updateProgress(98, "Creating ZIP…");
      const zipBlob = await packageFilesAsZip(results);

      const base = session.file.name.replace(/\.pdf$/i, "");
      const filename = `${base}_png_${dpi}dpi.zip`;
      setComplete(zipBlob, filename);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    session.pageCount,
    dpi,
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
    dpi,
    setDpi,
    pageRange,
    setPageRange,
    isPending,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
