/**
 * useTextToPdf — hook for the Text to PDF tool.
 * Font/size/line-spacing/margin/page-size controls, Worker conversion.
 * Requirements: 40.1, 40.2, 40.3, 40.4
 */

import { useState, useCallback } from "react";
import { useAuroraStore } from "@/stores/aurora.store";
import { textToPdf, type TextToPdfConfig } from "@/engines/conversion-engine";

const TXT_ACCEPT = [{ mime: "text/plain", extension: ".txt" }];

export function useTextToPdf() {
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

  // Typography / layout config
  const [fontFamily, setFontFamily] = useState<string>("Helvetica");
  const [fontSize, setFontSize] = useState(11);
  const [lineSpacing, setLineSpacing] = useState(1.4);
  const [marginTop, setMarginTop] = useState(50);
  const [marginRight, setMarginRight] = useState(50);
  const [marginBottom, setMarginBottom] = useState(50);
  const [marginLeft, setMarginLeft] = useState(50);
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Legal">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const dropped = files[0];
      if (!dropped.name.endsWith(".txt") && dropped.type !== "text/plain") {
        failSession("Please upload a .txt file.");
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
    updateProgress(5, "Reading text file…");

    try {
      const text = await file.text();
      updateProgress(20, "Converting to PDF…");

      const config: TextToPdfConfig = {
        fontFamily,
        fontSize,
        lineSpacing,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        pageSize,
        orientation,
      };

      const pdfBytes = await textToPdf(text, config);
      updateProgress(95, "Saving…");

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const base = file.name.replace(/\.txt$/i, "");
      setComplete(blob, `${base}.pdf`);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsPending(false);
    }
  }, [
    file,
    fontFamily,
    fontSize,
    lineSpacing,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    pageSize,
    orientation,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

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
    handleFileDrop,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    lineSpacing,
    setLineSpacing,
    marginTop,
    setMarginTop,
    marginRight,
    setMarginRight,
    marginBottom,
    setMarginBottom,
    marginLeft,
    setMarginLeft,
    pageSize,
    setPageSize,
    orientation,
    setOrientation,
    isPending,
    handleApply,
    handleReset,
    TXT_ACCEPT,
  };
}
