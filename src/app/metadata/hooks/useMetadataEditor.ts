/**
 * useMetadataEditor — hook for the Metadata Editor tool.
 * Display all 8 metadata fields, edit Title/Author/Subject/Keywords,
 * clear all, Worker export.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { useState, useCallback, useEffect } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modDate: string;
}

const EMPTY_METADATA: PdfMetadata = {
  title: "",
  author: "",
  subject: "",
  keywords: "",
  creator: "",
  producer: "",
  creationDate: "",
  modDate: "",
};

async function readMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  function getInfoField(key: string): string {
    try {
      const infoRef = pdfDoc.context.trailerInfo.Info;
      if (!infoRef) return "";
      const infoDict = pdfDoc.context.lookup(infoRef);
      if (
        !infoDict ||
        typeof (infoDict as { get?: unknown }).get !== "function"
      )
        return "";
      const val = (infoDict as any).get(PDFName.of(key));
      if (!val) return "";
      return val.toString().replace(/^[\s(]+|[\s)]+$/g, "");
    } catch {
      return "";
    }
  }

  return {
    title: getInfoField("Title"),
    author: getInfoField("Author"),
    subject: getInfoField("Subject"),
    keywords: getInfoField("Keywords"),
    creator: getInfoField("Creator"),
    producer: getInfoField("Producer"),
    creationDate: getInfoField("CreationDate"),
    modDate: getInfoField("ModDate"),
  };
}

interface WriteMetadataConfig {
  metadata: PdfMetadata;
}

async function writeMetadata(
  bytes: Uint8Array,
  config: WriteMetadataConfig,
  onProgress: (pct: number, label?: string) => void,
): Promise<Uint8Array> {
  onProgress(10, "Loading PDF…");
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  onProgress(40, "Writing metadata…");

  const { metadata } = config;

  // Get or create the Info dictionary
  let infoRef = pdfDoc.context.trailerInfo.Info;
  if (!infoRef) {
    const newInfo = pdfDoc.context.obj({});
    infoRef = pdfDoc.context.register(newInfo);
    pdfDoc.context.trailerInfo.Info = infoRef;
  }

  const infoDict = pdfDoc.context.lookup(infoRef);
  if (infoDict && typeof (infoDict as { set?: unknown }).set === "function") {
    const dict = infoDict as any;
    const setOrDelete = (key: string, value: string) => {
      if (value.trim()) {
        dict.set(PDFName.of(key), PDFString.of(value.trim()));
      } else {
        dict.delete(PDFName.of(key));
      }
    };

    setOrDelete("Title", metadata.title);
    setOrDelete("Author", metadata.author);
    setOrDelete("Subject", metadata.subject);
    setOrDelete("Keywords", metadata.keywords);
    // Creator and Producer are read-only display fields — don't overwrite
  }

  onProgress(80, "Saving PDF…");
  const result = await pdfDoc.save({ useObjectStreams: false });
  onProgress(100, "Done");
  return result;
}

export function useMetadataEditor() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT });
  const [originalMetadata, setOriginalMetadata] = useState<PdfMetadata | null>(
    null,
  );
  const [editedMetadata, setEditedMetadata] =
    useState<PdfMetadata>(EMPTY_METADATA);
  const [isReadingMeta, setIsReadingMeta] = useState(false);

  // Read metadata when file is loaded
  useEffect(() => {
    if (session.bytes && session.file) {
      setIsReadingMeta(true);
      readMetadata(session.bytes)
        .then((meta) => {
          setOriginalMetadata(meta);
          setEditedMetadata(meta);
        })
        .catch(() => {
          setOriginalMetadata(EMPTY_METADATA);
          setEditedMetadata(EMPTY_METADATA);
        })
        .finally(() => setIsReadingMeta(false));
    }
  }, [session.bytes, session.file]);

  const processor = usePdfProcessor<WriteMetadataConfig>({
    processFn: writeMetadata,
    outputSuffix: "metadata",
  });

  const handleSave = useCallback(() => {
    if (!session.file) return;
    processor.run(session.file, { metadata: editedMetadata });
  }, [session.file, editedMetadata, processor]);

  const handleClearAll = useCallback(() => {
    setEditedMetadata(EMPTY_METADATA);
  }, []);

  const handleReset = useCallback(() => {
    session.reset();
    setOriginalMetadata(null);
    setEditedMetadata(EMPTY_METADATA);
  }, [session]);

  const updateField = useCallback((field: keyof PdfMetadata, value: string) => {
    setEditedMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    file: session.file,
    isLoading: session.isLoading || isReadingMeta,
    handleFileDrop: session.handleDrop,
    originalMetadata,
    editedMetadata,
    updateField,
    processor,
    handleSave,
    handleClearAll,
    handleReset,
    PDF_ACCEPT,
  };
}
