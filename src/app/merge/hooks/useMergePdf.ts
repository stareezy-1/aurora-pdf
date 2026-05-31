/**
 * useMergePdf — hook for the Merge PDF tool.
 * Supports reorderable file list (drag-and-drop), password prompt for
 * protected files, and Worker merge via organization-engine.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useState, useCallback } from "react";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { mergePdfs } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

export interface MergeFile {
  id: string;
  file: File;
  password?: string;
  error?: string;
}

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const MAX_FILES = 20;

export function useMergePdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const [files, setFiles] = useState<MergeFile[]>([]);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const processor = usePdfProcessor<MergeFile[]>({
    processFn: async (_, mergeFiles, onProgress) => {
      const buffers: Uint8Array[] = [];
      for (const mf of mergeFiles) {
        const bytes = new Uint8Array(await mf.file.arrayBuffer());
        buffers.push(bytes);
      }
      return mergePdfs(buffers, onProgress);
    },
    outputSuffix: "merged",
  });

  const handleFileDrop = useCallback((dropped: File[]) => {
    const valid = dropped.filter((f) => f.type === "application/pdf");
    setFiles((prev) => {
      const combined = [
        ...prev,
        ...valid.map((f) => ({ id: crypto.randomUUID(), file: f })),
      ];
      return combined.slice(0, MAX_FILES);
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const setPassword = useCallback((id: string, password: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, password } : f)));
  }, []);

  const handleDrop = useCallback((srcIdx: number, dstIdx: number) => {
    if (srcIdx === dstIdx) return;
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(dstIdx, 0, moved);
      return next;
    });
    setDragSrc(null);
    setDragOver(null);
  }, []);

  const handleMerge = useCallback(() => {
    if (files.length < 2) return;
    // Create a dummy File to satisfy usePdfProcessor signature
    const dummyFile = files[0].file;
    processor.run(dummyFile, files);
  }, [files, processor]);

  const handleReset = useCallback(() => {
    setFiles([]);
    useAuroraStore.getState().clearWorkbox();
  }, []);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    files,
    dragSrc,
    dragOver,
    setDragSrc,
    setDragOver,
    handleFileDrop,
    removeFile,
    setPassword,
    handleDrop,
    handleMerge,
    handleReset,
    MAX_FILES,
    PDF_ACCEPT,
  };
}
