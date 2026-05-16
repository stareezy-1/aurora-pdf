export type ToolName =
  | "compress"
  | "ocr"
  | "pdf-to-jpg"
  | "pdf-to-word"
  | "word-to-pdf"
  | "pdf-to-excel"
  | "excel-to-pdf"
  | "edit"
  | "sign"
  | "watermark"
  | "split"
  | "split-zip"
  | "html-to-pdf"
  | "organize"
  | "protect";

const TOOL_SUFFIX: Record<ToolName, string> = {
  compress: "_compressed.pdf",
  ocr: "ocr-output.pdf", // fixed name, base ignored
  "pdf-to-jpg": "_page1.jpg", // single page; multi-page handled separately
  "pdf-to-word": ".docx",
  "word-to-pdf": ".pdf",
  "pdf-to-excel": ".xlsx",
  "excel-to-pdf": ".pdf",
  edit: "_edited.pdf",
  sign: "_signed.pdf",
  watermark: "_watermarked.pdf",
  split: "_split.pdf",
  "split-zip": "_split_parts.zip",
  "html-to-pdf": "_converted.pdf",
  organize: "_organized.pdf",
  protect: "_protected.pdf",
};

/**
 * Strips path separators and the existing extension from `originalName`,
 * then appends the tool-specific suffix/extension.
 *
 * Special cases:
 *  - 'ocr'       → always returns 'ocr-output.pdf'
 *  - 'pdf-to-jpg' multi-page → caller should use buildPdfToJpgZipFilename()
 */
export function buildOutputFilename(
  originalName: string,
  tool: ToolName,
): string {
  if (tool === "ocr") return "ocr-output.pdf";

  // Strip any path separators (Windows \ or Unix /)
  const basename = originalName.replace(/[/\\]/g, "");

  // Strip existing extension
  const dotIndex = basename.lastIndexOf(".");
  const base = dotIndex >= 0 ? basename.slice(0, dotIndex) : basename;

  return `${base}${TOOL_SUFFIX[tool]}`;
}

/** Returns `{base}_pages.zip` for multi-page PDF-to-JPG output. */
export function buildPdfToJpgZipFilename(originalName: string): string {
  const basename = originalName.replace(/[/\\]/g, "");
  const dotIndex = basename.lastIndexOf(".");
  const base = dotIndex >= 0 ? basename.slice(0, dotIndex) : basename;
  return `${base}_pages.zip`;
}

/** Returns `{base}_page{n}.jpg` for a single rendered page. */
export function buildPageJpgFilename(
  originalName: string,
  pageNumber: number,
): string {
  const basename = originalName.replace(/[/\\]/g, "");
  const dotIndex = basename.lastIndexOf(".");
  const base = dotIndex >= 0 ? basename.slice(0, dotIndex) : basename;
  return `${base}_page${pageNumber}.jpg`;
}
