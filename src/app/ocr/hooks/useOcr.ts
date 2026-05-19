import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { recognizeAll, getSupportedLanguages } from "@/engines/ocr-engine";
import { assembleTextPdf, renderPagePreview } from "@/engines/pdf-engine";

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
  const [langSearch, setLangSearch] = useState("");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [blankPages, setBlankPages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState<string>("");
  const [pdfPreviews, setPdfPreviews] = useState<string[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const languages = getSupportedLanguages();

  const processor = useFileProcessor({
    process: async (_file, onProgress) => {
      const results = await recognizeAll(files, language, onProgress);
      const blanks = results
        .filter((r) => !r.text.trim())
        .map((r) => files[r.imageIndex]?.name ?? `Image ${r.imageIndex + 1}`);
      setBlankPages(blanks);

      // Capture confidence scores per image
      const scores = results
        .sort((a, b) => a.imageIndex - b.imageIndex)
        .map((r) => r.confidence ?? 0);
      setConfidenceScores(scores);

      // Capture all extracted text for the preview panel
      const allText = results
        .sort((a, b) => a.imageIndex - b.imageIndex)
        .map((r, i) => `--- Page ${i + 1} ---\n${r.text.trim()}`)
        .join("\n\n");
      setExtractedText(allText);

      const pdfBytes = await assembleTextPdf(results);

      // Render PDF pages for preview (up to 5 pages)
      const pageCount = Math.min(results.length, 5);
      const previews: string[] = [];
      for (let i = 0; i < pageCount; i++) {
        try {
          previews.push(await renderPagePreview(pdfBytes, i));
        } catch {
          /* skip failed renders */
        }
      }
      setPdfPreviews(previews);

      return {
        blob: new Blob([pdfBytes], { type: "application/pdf" }),
        filename: "ocr-output.pdf",
      };
    },
  });

  function handleFilesAccepted(newFiles: File[]) {
    setFiles(newFiles);
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
    // Reset previous results
    setExtractedText("");
    setPdfPreviews([]);
  }

  function handleRun() {
    if (files.length === 0) return;
    processor.run(files[0]);
  }

  function handleReset() {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    clearWorkbox();
    setFiles([]);
    setImagePreviews([]);
    setBlankPages([]);
    setExtractedText("");
    setPdfPreviews([]);
    setConfidenceScores([]);
    setCopied(false);
    setLangSearch("");
    setLangDropdownOpen(false);
  }

  async function handleCopyText() {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the textarea
    }
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
    langSearch,
    setLangSearch,
    langDropdownOpen,
    setLangDropdownOpen,
    files,
    setFiles,
    imagePreviews,
    blankPages,
    extractedText,
    pdfPreviews,
    confidenceScores,
    copied,
    languages,
    processor,
    handleFilesAccepted,
    handleRun,
    handleReset,
    handleCopyText,
  };
}
