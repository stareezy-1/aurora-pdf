import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { isEncrypted } from "@/engines/pdf-engine";
import { pdfToXlsx } from "@/engines/conversion-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import { NoTablesError } from "@/lib/errors";

export function usePdfToExcel() {
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
  const [noTables, setNoTables] = useState(false);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (await isEncrypted(bytes))
        throw new Error("This PDF is password-protected.");
      const { sheets, bytes: xlsxBytes } = await pdfToXlsx(bytes, onProgress);
      if (sheets.length === 0) {
        setNoTables(true);
        throw new NoTablesError();
      }
      return {
        blob: new Blob([xlsxBytes as any], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename: buildOutputFilename(file.name, "pdf-to-excel"),
      };
    },
  });

  function handleReset() {
    clearWorkbox();
    setPendingFile(null);
    setNoTables(false);
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
    setPendingFile,
    noTables,
    setNoTables,
    processor,
    handleReset,
  };
}
