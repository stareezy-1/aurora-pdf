import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { compress, renderPagePreview } from "@/engines/pdf-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import type { CompressionLevel } from "@/types/tool.types";

export function useCompressPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [level, setLevel] = useState<CompressionLevel>("standard");
  const [stats, setStats] = useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [noReduction, setNoReduction] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const originalSize = file.size;
      const bytes = await compress(file, level, onProgress);
      const blob = new Blob([bytes as any], { type: "application/pdf" });
      if (blob.size >= originalSize) {
        setNoReduction(true);
        setStats({ original: originalSize, compressed: blob.size });
        return {
          blob: file,
          filename: buildOutputFilename(file.name, "compress"),
        };
      }
      setNoReduction(false);
      setStats({ original: originalSize, compressed: blob.size });
      return { blob, filename: buildOutputFilename(file.name, "compress") };
    },
  });

  async function handleFileDrop(files: File[]) {
    const file = files[0];
    setPendingFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const p = await renderPagePreview(bytes, 0);
    setPreview(p);
  }

  function handleReset() {
    clearWorkbox();
    setPendingFile(null);
    setPreview(null);
    setStats(null);
  }

  return {
    level,
    setLevel,
    stats,
    noReduction,
    preview,
    pendingFile,
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    handleFileDrop,
    handleReset,
    processor,
  };
}
