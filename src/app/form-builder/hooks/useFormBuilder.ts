/**
 * useFormBuilder — hook for the Create PDF Form tool.
 * Drag-and-drop field palette, field config panel, CoordinateMapper placement,
 * Worker export via pdf-lib AcroForm API.
 *
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
 */

import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export type FieldType =
  | "text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "date"
  | "signature";

export interface FormFieldDef {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  pageIndex: number;
  /** CSS pixels from left of preview container */
  x: number;
  /** CSS pixels from top of preview container */
  y: number;
  width: number;
  height: number;
  required: boolean;
  options?: string[]; // for dropdown/radio
  defaultValue?: string;
}

let _counter = 0;
function nextId(type: FieldType): string {
  return `${type}-${Date.now()}-${++_counter}`;
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

export function useFormBuilder() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({
    accept: PDF_ACCEPT,
    generatePreview: true,
  });

  const [fields, setFields] = useState<FormFieldDef[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const previewRef = useRef<HTMLImageElement | null>(null);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const addField = useCallback(
    (type: FieldType, x: number, y: number) => {
      const id = nextId(type);
      const newField: FormFieldDef = {
        id,
        type,
        name: `${type}_${id.split("-")[1]}`,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
        pageIndex: currentPage,
        x,
        y,
        width: type === "checkbox" ? 20 : 180,
        height: type === "checkbox" ? 20 : 28,
        required: false,
        options:
          type === "dropdown" || type === "radio"
            ? ["Option 1", "Option 2"]
            : undefined,
      };
      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(id);
    },
    [currentPage],
  );

  const updateField = useCallback(
    (id: string, updates: Partial<FormFieldDef>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId((prev) => (prev === id ? null : prev));
  }, []);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    setIsPending(true);
    setNewFile(session.file);
    updateProgress(0, "Loading PDF…");

    try {
      const pdfDoc = await PDFDocument.load(copyBytes(session.bytes));
      const pages = pdfDoc.getPages();
      const form = pdfDoc.getForm();

      // Get page dimensions for coordinate mapping
      const pageDims = pages.map((p) => p.getSize());

      updateProgress(20, "Embedding form fields…");

      // We need the preview image dimensions for coordinate mapping
      const imgEl = previewRef.current;
      const imgW = imgEl?.clientWidth ?? 600;
      const imgH = imgEl?.clientHeight ?? 800;

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const pageIdx = Math.min(field.pageIndex, pages.length - 1);
        const dim = pageDims[pageIdx];

        // Map CSS pixel coords to PDF points
        const scaleX = dim.width / imgW;
        const scaleY = dim.height / imgH;
        const pdfX = field.x * scaleX;
        const pdfY = dim.height - (field.y + field.height) * scaleY;
        const pdfW = field.width * scaleX;
        const pdfH = field.height * scaleY;

        updateProgress(
          20 + Math.round((i / fields.length) * 60),
          `Adding field ${i + 1} of ${fields.length}…`,
        );

        try {
          if (
            field.type === "text" ||
            field.type === "date" ||
            field.type === "signature"
          ) {
            const tf = form.createTextField(field.name);
            tf.addToPage(pages[pageIdx], {
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
            });
            if (field.defaultValue) tf.setText(field.defaultValue);
          } else if (field.type === "checkbox") {
            const cb = form.createCheckBox(field.name);
            cb.addToPage(pages[pageIdx], {
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
            });
          } else if (field.type === "dropdown") {
            const dd = form.createDropdown(field.name);
            dd.addToPage(pages[pageIdx], {
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
            });
            if (field.options?.length) {
              dd.setOptions(field.options);
            }
          } else if (field.type === "radio") {
            const rg = form.createRadioGroup(field.name);
            const opts = field.options ?? ["Option 1", "Option 2"];
            opts.forEach((opt, idx) => {
              rg.addOptionToPage(opt, pages[pageIdx], {
                x: pdfX,
                y: pdfY - idx * (pdfH + 4),
                width: pdfH,
                height: pdfH,
              });
            });
          }
        } catch {
          // Skip fields that fail to embed
        }
      }

      updateProgress(85, "Saving PDF…");
      const resultBytes = await pdfDoc.save();
      const blob = new Blob([resultBytes], { type: "application/pdf" });
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(blob, `${base}_form.pdf`);
    } catch (err) {
      failSession(
        err instanceof Error ? err.message : "Failed to create form.",
      );
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    fields,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setFields([]);
    setSelectedFieldId(null);
    setIsPending(false);
    setCurrentPage(0);
  }, [session]);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    file: session.file,
    pageCount: session.pageCount,
    preview: session.preview,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    fields,
    selectedField,
    selectedFieldId,
    setSelectedFieldId,
    addField,
    updateField,
    removeField,
    currentPage,
    setCurrentPage,
    isPending,
    handleApply,
    handleReset,
    previewRef,
    PDF_ACCEPT,
  };
}
