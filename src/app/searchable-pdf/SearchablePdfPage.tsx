import { useState, useCallback } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { usePageTitle } from "@/hooks/usePageTitle";
import { hasTextLayer, isEncrypted } from "@/engines/pdf-engine";
import { OcrWorkspacePage } from "./OcrWorkspacePage";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

/**
 * Entry point for the Searchable PDF OCR tool.
 * Accepts a PDF, checks for existing text layer and encryption,
 * then mounts OcrWorkspacePage.
 *
 * Requirements: 17.1, 17.2, 17.9
 */
export default function SearchablePdfPage() {
  usePageTitle("Searchable PDF OCR");
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAccepted = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setErrorMessage(null);

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Check encryption first
    const encrypted = await isEncrypted(bytes);
    if (encrypted) {
      setErrorMessage(
        "Encrypted PDFs are not supported. Please remove the password protection before proceeding.",
      );
      return;
    }

    // Check for existing text layer
    const hasText = await hasTextLayer(bytes);
    if (hasText) {
      const confirmed = window.confirm(
        "This PDF already contains a text layer. Running OCR may produce duplicate or overlapping text. Do you want to continue anyway?",
      );
      if (!confirmed) return;
    }

    setActiveFile(file);
  }, []);

  const handleReset = useCallback(() => {
    setActiveFile(null);
    setErrorMessage(null);
  }, []);

  if (activeFile) {
    return <OcrWorkspacePage file={activeFile} onReset={handleReset} />;
  }

  return (
    <ToolLayout toolName="Searchable PDF OCR">
      <div className="tool-header">
        <h1>🔎 Searchable PDF OCR</h1>
        <p>
          Convert scanned or image-based PDFs into searchable, selectable
          documents — entirely in your browser. No uploads, no servers.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="alert alert-error"
          style={{ marginBottom: 16 }}
        >
          ⚠ {errorMessage}
        </div>
      )}

      <FileDropZone
        accept={PDF_ACCEPT}
        onFilesAccepted={handleFilesAccepted}
        onError={(msg) => setErrorMessage(msg)}
        aria-label="Drop a PDF file to make it searchable"
      />
    </ToolLayout>
  );
}
