import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { docxToPdf } from "@/engines/conversion-engine";
import { buildOutputFilename } from "@/lib/filename-utils";

export function useWordToPdf() {
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

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = await docxToPdf(file, onProgress);
      return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        filename: buildOutputFilename(file.name, "word-to-pdf"),
      };
    },
  });

  function handleError(msg: string) {
    if (msg.toLowerCase().includes(".doc")) {
      useAuroraStore
        .getState()
        .failSession(
          "Only .docx files are supported. The older .doc format is not accepted.",
        );
    } else {
      useAuroraStore.getState().failSession(msg);
    }
  }

  function handleReset() {
    clearWorkbox();
    setPendingFile(null);
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
    processor,
    handleError,
    handleReset,
  };
}
