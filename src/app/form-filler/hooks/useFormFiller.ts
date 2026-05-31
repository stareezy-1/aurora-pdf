/**
 * useFormFiller — hook for the PDF Form Filler tool.
 * Reads AcroForm fields, lets user fill them, then exports via pdf-lib.
 *
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5
 */

import { useState, useCallback } from "react";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from "pdf-lib";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export interface FormField {
  name: string;
  type: "text" | "checkbox" | "radio" | "dropdown" | "unknown";
  value: string;
  options?: string[]; // for dropdown/radio
  checked?: boolean; // for checkbox
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

export function useFormFiller() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldChecked, setFieldChecked] = useState<Record<string, boolean>>({});
  const [isPending, setIsPending] = useState(false);
  const [isXfa, setIsXfa] = useState(false);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  // Parse AcroForm fields from the loaded PDF
  const parseFields = useCallback(async (bytes: Uint8Array) => {
    try {
      const pdfDoc = await PDFDocument.load(copyBytes(bytes), {
        ignoreEncryption: true,
      });
      const form = pdfDoc.getForm();
      const rawFields = form.getFields();

      // Check for XFA
      const catalog = pdfDoc.catalog;
      const acroForm = catalog.lookup(
        catalog.get("AcroForm" as never) as never,
      );
      const hasXfa =
        acroForm != null &&
        (acroForm as unknown as Record<string, unknown>)["XFA"] != null;
      setIsXfa(hasXfa);

      const parsed: FormField[] = rawFields.map((f) => {
        const name = f.getName();
        if (f instanceof PDFTextField) {
          return { name, type: "text" as const, value: f.getText() ?? "" };
        } else if (f instanceof PDFCheckBox) {
          return {
            name,
            type: "checkbox" as const,
            value: "",
            checked: f.isChecked(),
          };
        } else if (f instanceof PDFDropdown) {
          return {
            name,
            type: "dropdown" as const,
            value: f.getSelected()[0] ?? "",
            options: f.getOptions(),
          };
        } else if (f instanceof PDFRadioGroup) {
          return {
            name,
            type: "radio" as const,
            value: f.getSelected() ?? "",
            options: f.getOptions(),
          };
        }
        return { name, type: "unknown" as const, value: "" };
      });

      setFields(parsed);
      const initValues: Record<string, string> = {};
      const initChecked: Record<string, boolean> = {};
      parsed.forEach((f) => {
        initValues[f.name] = f.value;
        if (f.type === "checkbox") initChecked[f.name] = f.checked ?? false;
      });
      setFieldValues(initValues);
      setFieldChecked(initChecked);
    } catch {
      setFields([]);
    }
  }, []);

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      session.handleDrop(files);
      if (files.length > 0) {
        const bytes = new Uint8Array(await files[0].arrayBuffer());
        await parseFields(bytes);
      }
    },
    [session, parseFields],
  );

  const setFieldValue = useCallback((name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setFieldCheck = useCallback((name: string, checked: boolean) => {
    setFieldChecked((prev) => ({ ...prev, [name]: checked }));
  }, []);

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    setIsPending(true);
    setNewFile(session.file);
    updateProgress(0, "Loading PDF…");

    try {
      const pdfDoc = await PDFDocument.load(copyBytes(session.bytes), {
        ignoreEncryption: true,
      });
      const form = pdfDoc.getForm();

      updateProgress(30, "Filling form fields…");

      for (const field of fields) {
        try {
          if (field.type === "text") {
            const tf = form.getTextField(field.name);
            tf.setText(fieldValues[field.name] ?? "");
          } else if (field.type === "checkbox") {
            const cb = form.getCheckBox(field.name);
            if (fieldChecked[field.name]) cb.check();
            else cb.uncheck();
          } else if (field.type === "dropdown") {
            const dd = form.getDropdown(field.name);
            const val = fieldValues[field.name];
            if (val) dd.select(val);
          } else if (field.type === "radio") {
            const rg = form.getRadioGroup(field.name);
            const val = fieldValues[field.name];
            if (val) rg.select(val);
          }
        } catch {
          // Skip fields that can't be filled
        }
      }

      updateProgress(80, "Saving PDF…");
      const resultBytes = await pdfDoc.save();
      const blob = new Blob([resultBytes], { type: "application/pdf" });
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(blob, `${base}_filled.pdf`);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Failed to fill form.");
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    fields,
    fieldValues,
    fieldChecked,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setFields([]);
    setFieldValues({});
    setFieldChecked({});
    setIsPending(false);
    setIsXfa(false);
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
    handleFileDrop,
    fields,
    fieldValues,
    fieldChecked,
    setFieldValue,
    setFieldCheck,
    isPending,
    isXfa,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
