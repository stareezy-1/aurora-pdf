import { useState } from "react";
import * as XLSX from "xlsx";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { xlsxToPdf } from "@/engines/conversion-engine";
import { buildOutputFilename } from "@/lib/filename-utils";

export function useExcelToPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetCount, setSheetCount] = useState(0);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = await xlsxToPdf(file, onProgress);
      return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        filename: buildOutputFilename(file.name, "excel-to-pdf"),
      };
    },
  });

  async function handleFileDrop(files: File[]) {
    const file = files[0];
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      setSheetCount(wb.SheetNames.length);
    } catch {
      setSheetCount(0);
    }
    setPendingFile(file);
  }

  function handleReset() {
    clearWorkbox();
    setPendingFile(null);
    setSheetCount(0);
  }

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    pendingFile,
    sheetCount,
    processor,
    handleFileDrop,
    handleReset,
  };
}
