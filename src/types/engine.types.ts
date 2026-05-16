export interface ProgressCallback {
  (progress: number, label?: string): void;
}

export interface EngineResult<T = Uint8Array> {
  data: T;
  metadata?: Record<string, unknown>;
}

/** PDF_Engine output for PDF-to-JPG */
export interface PageImageResult {
  pageIndex: number;
  blob: Blob;
  filename: string;
}

/** Conversion_Engine output for PDF-to-Excel */
export interface TableSheet {
  label: string; // "Page {n} Table {m}"
  data: unknown[][];
}

export interface TextAnnotation {
  pageIndex: number;
  text: string;
  x: number; // points from left
  y: number; // points from bottom
  fontSize: number; // 8–144
  color: string; // hex
}

export interface OcrPageResult {
  text: string;
  imageIndex: number;
}
