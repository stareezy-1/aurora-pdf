/**
 * useHeaderFooter — hook for the Header & Footer tool.
 * 6-zone text inputs, dynamic token chips, font/color/margin controls, page range.
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { applyHeaderFooter } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import type { HeaderFooterConfig } from "@/types/tool.types";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

const DEFAULT_CONFIG: HeaderFooterConfig = {
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "{page}/{total}",
  footerRight: "",
  fontFamily: "Helvetica",
  fontSize: 10,
  color: "#000000",
  marginOffset: 20,
  pageRange: "",
};

export const DYNAMIC_TOKENS = [
  { token: "{page}", label: "Page #" },
  { token: "{total}", label: "Total Pages" },
  { token: "{date}", label: "Date" },
  { token: "{filename}", label: "Filename" },
];

export const FONTS = ["Helvetica", "Times New Roman", "Courier"];

export function useHeaderFooter() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [config, setConfig] = useState<HeaderFooterConfig>(DEFAULT_CONFIG);

  const processor = usePdfProcessor<{
    config: HeaderFooterConfig;
    filename: string;
  }>({
    processFn: async (bytes, { config: cfg, filename }, onProgress) => {
      return applyHeaderFooter(bytes, cfg, onProgress, filename);
    },
    outputSuffix: "header-footer",
  });

  const update = useCallback((patch: Partial<HeaderFooterConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const insertToken = useCallback(
    (field: keyof HeaderFooterConfig, token: string) => {
      setConfig((prev) => ({
        ...prev,
        [field]: String(prev[field] ?? "") + token,
      }));
    },
    [],
  );

  const handleApply = useCallback(() => {
    if (!session.file) return;
    processor.run(session.file, { config, filename: session.file.name });
  }, [session.file, config, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setConfig(DEFAULT_CONFIG);
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
    config,
    update,
    insertToken,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
