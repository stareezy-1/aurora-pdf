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
  rotation?: number; // degrees (optional, default 0)
  opacity?: number; // 0–100 percent (optional, default 100)
}

export interface OcrPageResult {
  text: string;
  imageIndex: number;
  confidence?: number; // 0–100, from Tesseract mean confidence
}

export interface ShapeAnnotation {
  pageIndex: number;
  type: "rectangle" | "circle" | "line";
  x: number; // points from left
  y: number; // points from bottom
  width: number;
  height: number;
  strokeColor: string; // hex
  fillColor: string | null; // hex or null for no fill
  strokeWidth: number; // pt
}

export interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

export interface SearchablePdfPage {
  pageIndex: number;
  imageDataUrl: string; // JPEG data URL of the rendered page
  imageWidth: number; // canvas pixel width
  imageHeight: number; // canvas pixel height
  words: OcrWord[];
}
