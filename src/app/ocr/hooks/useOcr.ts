import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { recognizeAll, getSupportedLanguages } from "@/engines/ocr-engine";
import { assembleTextPdf } from "@/engines/pdf-engine";

export function useOcr() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [language, setLanguage] = useState("eng");
  const [files, setFiles] = useState<File[]>([]);
  const [blankPages, setBlankPages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const languages = getSupportedLanguages();

  const processor = useFileProcessor({
    process: async (_file, onProgress) => {
      const results = await recognizeAll(files, language, onProgress);
      const blanks = results
        .filter((r) => !r.text.trim())
        .map((r) => files[r.imageIndex]?.name ?? `Image ${r.imageIndex + 1}`);
      setBlankPages(blanks);
      const pdfBytes = await assembleTextPdf(results);
      return {
        blob: new Blob([pdfBytes], { type: "application/pdf" }),
        filename: "ocr-output.pdf",
      };
    },
  });

  function handleFilesAccepted(newFiles: File[]) {
    setFiles(newFiles);
    // Generate object URL previews for each image
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  }

  function handleRun() {
    if (files.length === 0) return;
    processor.run(files[0]);
  }

  function handleReset() {
    // Revoke preview URLs to free memory
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    clearWorkbox();
    setFiles([]);
    setImagePreviews([]);
    setBlankPages([]);
  }

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    language,
    setLanguage,
    files,
    setFiles,
    imagePreviews,
    blankPages,
    languages,
    processor,
    handleFilesAccepted,
    handleRun,
    handleReset,
  };
}
