import { createWorker, PSM, OEM } from "tesseract.js";
import type { ProgressCallback, OcrPageResult } from "@/types/engine.types";
import type { OcrLanguage } from "@/types/tool.types";

export interface OcrLanguageOption {
  code: string;
  label: string;
}

const SUPPORTED_LANGUAGES: OcrLanguageOption[] = [
  { code: "ind", label: "Indonesian" },
  { code: "eng", label: "English" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "spa", label: "Spanish" },
  { code: "ita", label: "Italian" },
  { code: "por", label: "Portuguese" },
  { code: "nld", label: "Dutch" },
  { code: "rus", label: "Russian" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "jpn", label: "Japanese" },
  { code: "ara", label: "Arabic" },
  { code: "kor", label: "Korean" },
];

/**
 * Pre-process an image for better OCR accuracy:
 * - Upscale to at least 300 DPI equivalent (2× if small)
 * - Convert to greyscale
 * - Apply contrast enhancement
 */
async function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Scale up small images — Tesseract works best at ~300 DPI
      const MIN_DIM = 1500;
      const scale = Math.max(1, MIN_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // Draw scaled image
      ctx.drawImage(img, 0, 0, w, h);

      // Greyscale + contrast boost via pixel manipulation
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Greyscale
        const grey =
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Contrast stretch: push towards black/white
        const contrast = 1.4;
        const adjusted = Math.min(
          255,
          Math.max(0, (grey - 128) * contrast + 128),
        );
        data[i] = data[i + 1] = data[i + 2] = adjusted;
      }
      ctx.putImageData(imageData, 0, 0);

      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob ?? file), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/** Recognize text in a single image file. */
export async function recognize(
  image: File,
  language: OcrLanguage,
  onProgress: ProgressCallback,
): Promise<OcrPageResult> {
  const processed = await preprocessImage(image);
  const worker = await createWorker(language, OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === "recognizing text")
        onProgress(Math.round(m.progress * 100));
    },
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  try {
    const { data } = await worker.recognize(processed);
    return { text: data.text, imageIndex: 0 };
  } finally {
    await worker.terminate();
  }
}

/**
 * Recognize text in multiple images sequentially.
 * Pre-processes each image before OCR for better accuracy.
 */
export async function recognizeAll(
  images: File[],
  language: OcrLanguage,
  onProgress: ProgressCallback,
): Promise<OcrPageResult[]> {
  const n = images.length;
  const worker = await createWorker(language, OEM.LSTM_ONLY);
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });

  try {
    const results: OcrPageResult[] = [];
    for (let i = 0; i < n; i++) {
      const k = i + 1;
      const pct = Math.round((k / n) * 100);
      onProgress(Math.round((i / n) * 100), `Processing image ${k} of ${n}…`);

      const processed = await preprocessImage(images[i]);
      const { data } = await worker.recognize(processed);
      results.push({
        text: data.text,
        imageIndex: i,
        confidence: data.confidence,
      });

      onProgress(pct, `Processing image ${k} of ${n} — ${pct}%`);
    }
    return results;
  } finally {
    await worker.terminate();
  }
}

export function getSupportedLanguages(): OcrLanguageOption[] {
  return SUPPORTED_LANGUAGES;
}

/**
 * Recognize text in an image and return word-level bounding boxes.
 * Each entry contains the word text and its pixel coordinates on the image.
 * Words with empty or whitespace-only text are filtered out.
 */
export async function recognizeWithBoundingBoxes(
  image: HTMLCanvasElement | Blob,
  language: OcrLanguage,
): Promise<
  Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>
> {
  const worker = await createWorker(language, OEM.LSTM_ONLY);
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  try {
    const { data } = await worker.recognize(image);
    return data.words
      .filter((word) => word.text.trim().length > 0)
      .map((word) => ({
        text: word.text,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      }));
  } finally {
    await worker.terminate();
  }
}
