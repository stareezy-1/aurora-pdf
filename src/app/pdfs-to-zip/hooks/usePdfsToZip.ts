/**
 * usePdfsToZip — hook for the PDFs to ZIP tool.
 * Accept 2–50 files, rename before packaging, Worker ZIP creation.
 * Requirements: 58.1, 58.2, 58.3, 58.4
 */

import { useState, useCallback } from "react";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { packageFilesAsZip } from "@/lib/zip-helper";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const MIN_FILES = 2;
const MAX_FILES = 50;

export interface ZipEntry {
  id: string;
  file: File;
  customName: string;
}

export function usePdfsToZip() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const [entries, setEntries] = useState<ZipEntry[]>([]);

  const processor = usePdfProcessor<ZipEntry[]>({
    processFn: async (_, zipEntries, onProgress) => {
      const total = zipEntries.length;
      const fileEntries = [];
      for (let i = 0; i < total; i++) {
        onProgress(
          Math.round((i / total) * 90),
          `Reading file ${i + 1} of ${total}…`,
        );
        const bytes = new Uint8Array(await zipEntries[i].file.arrayBuffer());
        const name = zipEntries[i].customName.trim() || zipEntries[i].file.name;
        const filename = name.endsWith(".pdf") ? name : `${name}.pdf`;
        fileEntries.push({ filename, data: bytes });
      }
      onProgress(95, "Creating ZIP…");
      const blob = await packageFilesAsZip(fileEntries);
      onProgress(100, "Done");
      return new Uint8Array(await blob.arrayBuffer());
    },
    outputSuffix: "archive",
    outputMime: "application/zip",
  });

  const handleFileDrop = useCallback((dropped: File[]) => {
    const valid = dropped.filter((f) => f.type === "application/pdf");
    setEntries((prev) => {
      const combined = [
        ...prev,
        ...valid.map((f) => ({
          id: crypto.randomUUID(),
          file: f,
          customName: f.name,
        })),
      ];
      return combined.slice(0, MAX_FILES);
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const renameEntry = useCallback((id: string, name: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, customName: name } : e)),
    );
  }, []);

  const handleCreate = useCallback(() => {
    if (entries.length < MIN_FILES) return;
    // Use first file as dummy arg
    processor.run(entries[0].file, entries);
  }, [entries, processor]);

  const handleReset = useCallback(() => {
    setEntries([]);
    useAuroraStore.getState().clearWorkbox();
  }, []);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    entries,
    handleFileDrop,
    removeEntry,
    renameEntry,
    handleCreate,
    handleReset,
    MIN_FILES,
    MAX_FILES,
    PDF_ACCEPT,
  };
}
