/**
 * usePptxToPdf — hook for the PowerPoint to PDF tool.
 * .pptx/.ppt file input, Worker conversion, PDF download.
 * Requirements: 42.1, 42.2, 42.3, 42.4
 */

import { useState, useCallback } from "react";
import { useAuroraStore } from "@/stores/aurora.store";
import { pptxToPdf } from "@/engines/conversion-engine";

const PPTX_ACCEPT = [
  {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: ".pptx",
  },
  { mime: "application/vnd.ms-powerpoint", extension: ".ppt" },
];

export function usePptxToPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleFileDrop = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const dropped = files[0];
      const name = dropped.name.toLowerCase();
      if (!name.endsWith(".pptx") && !name.endsWith(".ppt")) {
        failSession("Please upload a .pptx or .ppt file.");
        return;
      }
      setFile(dropped);
    },
    [failSession],
  );

  const handleApply = useCallback(async () => {
    if (!file) return;
    setIsPending(true);
    setNewFile(file);
    updateProgress(5, "Reading presentation…");

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfBytes = await pptxToPdf(bytes, (pct, label) =>
        updateProgress(pct, label),
      );

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const base = file.name.replace(/\.(pptx|ppt)$/i, "");
      setComplete(blob, `${base}.pdf`);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsPending(false);
    }
  }, [file, setNewFile, updateProgress, setComplete, failSession]);

  const handleReset = useCallback(() => {
    useAuroraStore.getState().clearWorkbox();
    setFile(null);
    setIsPending(false);
  }, []);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    file,
    isPending,
    handleFileDrop,
    handleApply,
    handleReset,
    PPTX_ACCEPT,
  };
}
