const MB = 1024 * 1024;
const KB = 1024;

/** Returns "X.XX KB" or "X.XX MB" depending on size. */
export function formatFileInfo(name: string, bytes: number): string {
  const size =
    bytes < MB
      ? `${(bytes / KB).toFixed(2)} KB`
      : `${(bytes / MB).toFixed(2)} MB`;
  return `${name} — ${size}`;
}

/** Returns percentage reduction to 2 decimal places. */
export function formatCompressionStats(
  originalBytes: number,
  compressedBytes: number,
): string {
  if (originalBytes === 0) return "0.00%";
  const pct = ((originalBytes - compressedBytes) / originalBytes) * 100;
  return `${pct.toFixed(2)}%`;
}

/** Returns total bytes and file count for a list of files. */
export function formatCombinedSize(files: File[]): {
  totalBytes: number;
  count: number;
} {
  return {
    totalBytes: files.reduce((sum, f) => sum + f.size, 0),
    count: files.length,
  };
}

/** Returns the browser tab title for a tool page. */
export function formatPageTitle(toolName: string): string {
  return `${toolName} — AuroraPDF`;
}

/** Returns breadcrumb parts for a tool page. */
export function formatBreadcrumb(toolName: string): {
  home: string;
  tool: string;
} {
  return { home: "Home", tool: toolName };
}

/** ≤15-word descriptions for all 11 tools. */
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  "Compress PDF":
    "Reduce PDF file size while preserving quality, entirely in your browser.",
  "OCR: Images to PDF":
    "Extract text from images and create a searchable PDF document.",
  "PDF to JPG": "Convert each PDF page into a high-resolution JPEG image file.",
  "PDF to Word":
    "Extract text and structure from a PDF into an editable Word document.",
  "Word to PDF":
    "Convert a Word document into a universally readable PDF file.",
  "PDF to Excel":
    "Extract tables from a PDF into an editable Excel spreadsheet.",
  "Excel to PDF": "Convert an Excel spreadsheet into a fixed, print-ready PDF.",
  "Edit PDF": "Add text, delete pages, and reorder pages in any PDF document.",
  "Sign PDF": "Draw, type, or upload a signature and embed it into your PDF.",
  "Add Watermark": "Apply a custom text watermark to every page of your PDF.",
  "Split PDF": "Extract specific pages from a PDF into a new, smaller file.",
};
