import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { isEncrypted, hasTextLayer } from "@/engines/pdf-engine";
import { pdfToDocx } from "@/engines/conversion-engine";
import { buildOutputFilename } from "@/lib/filename-utils";

type PreflightState = "idle" | "checking" | "ready" | "encrypted" | "no-text";

export function usePdfToWord() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [preflight, setPreflight] = useState<PreflightState>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const bytes2 = await pdfToDocx(bytes, onProgress);
      return {
        blob: new Blob([bytes2], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        filename: buildOutputFilename(file.name, "pdf-to-word"),
      };
    },
  });

  async function handleFileDrop(files: File[]) {
    const file = files[0];
    setPendingFile(file);
    setPreflight("checking");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (await isEncrypted(bytes)) {
        setPreflight("encrypted");
        useAuroraStore
          .getState()
          .failSession("This PDF is password-protected.");
        return;
      }
      if (!(await hasTextLayer(bytes))) {
        setPreflight("no-text");
        return;
      }
      setPreflight("ready");
    } catch {
      setPreflight("idle");
    }
  }

  function handleReset() {
    clearWorkbox();
    setPreflight("idle");
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
    preflight,
    pendingFile,
    processor,
    handleFileDrop,
    handleReset,
  };
}
