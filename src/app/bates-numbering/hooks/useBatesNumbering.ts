/**
 * useBatesNumbering — hook for the Bates Numbering tool.
 * Multi-file input, format config, position via CoordinateMapper, Worker export.
 * Requirements: 39.1, 39.2, 39.3, 39.4
 */

import { useState, useCallback } from "react";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import {
  applyBatesNumbering,
  type BatesConfig,
  type BatesPosition,
} from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import { packageFilesAsZip } from "@/lib/zip-helper";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const MAX_FILES = 20;

const DEFAULT_CONFIG: BatesConfig = {
  startNumber: 1,
  digits: 6,
  prefix: "",
  suffix: "",
  fontSize: 9,
  color: "#000000",
  position: "bottom-right",
};

export const BATES_POSITIONS: { value: BatesPosition; label: string }[] = [
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
];

export interface BatesFile {
  id: string;
  file: File;
}

export function useBatesNumbering() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const [files, setFiles] = useState<BatesFile[]>([]);
  const [config, setConfig] = useState<BatesConfig>(DEFAULT_CONFIG);

  const processor = usePdfProcessor<{
    files: BatesFile[];
    config: BatesConfig;
  }>({
    processFn: async (_, { files: batesFiles, config: cfg }, onProgress) => {
      const buffers: Uint8Array[] = [];
      for (const bf of batesFiles) {
        buffers.push(new Uint8Array(await bf.file.arrayBuffer()));
      }
      const results = await applyBatesNumbering(buffers, cfg, onProgress);

      if (results.length === 1) {
        return results[0];
      }

      // Multiple files → ZIP
      const entries = results.map((bytes, i) => ({
        filename: batesFiles[i].file.name.replace(/\.pdf$/i, "_bates.pdf"),
        data: bytes,
      }));
      const zipBlob = await packageFilesAsZip(entries);
      return new Uint8Array(await zipBlob.arrayBuffer());
    },
    outputSuffix: "bates",
    outputMime: files.length > 1 ? "application/zip" : "application/pdf",
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

  const update = useCallback((patch: Partial<BatesConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApply = useCallback(() => {
    if (files.length === 0) return;
    // Use first file as the "file" arg (processor reads it again internally)
    processor.run(files[0].file, { files, config });
  }, [files, config, processor]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setConfig(DEFAULT_CONFIG);
    useAuroraStore.getState().clearWorkbox();
  }, []);

  // Preview label
  const previewLabel = `${config.prefix ?? ""}${"0".repeat(
    Math.max(0, (config.digits ?? 6) - 1),
  )}${config.startNumber ?? 1}${config.suffix ?? ""}`;

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    files,
    config,
    update,
    handleFileDrop,
    removeFile,
    handleApply,
    handleReset,
    previewLabel,
    MAX_FILES,
    PDF_ACCEPT,
  };
}
