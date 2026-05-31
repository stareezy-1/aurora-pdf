/**
 * useMarkdownToPdf — hook for the Markdown to PDF tool.
 * Live preview, theme selector, Worker conversion.
 * Requirements: 41.1, 41.2, 41.3, 41.4
 */

import { useState, useCallback } from "react";
import { useAuroraStore } from "@/stores/aurora.store";
import { markdownToPdf, type MarkdownTheme } from "@/engines/conversion-engine";

const MD_ACCEPT = [
  { mime: "text/markdown", extension: ".md" },
  { mime: "text/plain", extension: ".txt" },
];

export function useMarkdownToPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const [file, setFile] = useState<File | null>(null);
  const [markdownText, setMarkdownText] = useState("");
  const [theme, setTheme] = useState<MarkdownTheme>("light");
  const [isPending, setIsPending] = useState(false);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const dropped = files[0];
      try {
        const text = await dropped.text();
        setFile(dropped);
        setMarkdownText(text);
      } catch {
        failSession("Failed to read the file.");
      }
    },
    [failSession],
  );

  const handleApply = useCallback(async () => {
    if (!markdownText.trim()) {
      failSession("No Markdown content to convert.");
      return;
    }
    setIsPending(true);
    const fakeFile =
      file ??
      new File([markdownText], "document.md", { type: "text/markdown" });
    setNewFile(fakeFile);

    try {
      const pdfBytes = await markdownToPdf(markdownText, theme, (pct, label) =>
        updateProgress(pct, label),
      );

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const base = (file?.name ?? "document").replace(/\.(md|txt)$/i, "");
      setComplete(blob, `${base}.pdf`);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsPending(false);
    }
  }, [
    file,
    markdownText,
    theme,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    useAuroraStore.getState().clearWorkbox();
    setFile(null);
    setMarkdownText("");
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
    markdownText,
    setMarkdownText,
    theme,
    setTheme,
    isPending,
    handleFileDrop,
    handleApply,
    handleReset,
    MD_ACCEPT,
  };
}
