/**
 * Signature Manager — client-side module for creating, storing, and applying
 * digital signatures.
 *
 * Responsibilities:
 * - Persist up to 5 saved signatures in localStorage (survive page refresh)
 * - Rename / delete / select saved signatures
 * - Offer 6+ font options for the Type method
 * - Apply multiple SignaturePlacement[] to a PDF in a single pass using pdf-lib
 * - All positions computed via CoordinateMapper
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import { PDFDocument, degrees } from "pdf-lib";
import type { SignaturePlacement, SavedSignature } from "@/types/tool.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of saved signatures persisted in localStorage. */
export const MAX_SAVED_SIGNATURES = 5;

/** localStorage key for the saved signatures array. */
const STORAGE_KEY = "aurora-saved-signatures";

/**
 * Six+ cursive/script font options for the Type signature method.
 * Requirements: 4.3
 */
export const SIGNATURE_FONTS = [
  "Dancing Script",
  "Pacifico",
  "Great Vibes",
  "Sacramento",
  "Allura",
  "Pinyon Script",
] as const;

export type SignatureFont = (typeof SIGNATURE_FONTS)[number];

/**
 * Google Fonts URL that loads all SIGNATURE_FONTS in a single request.
 * Inject this into the document <head> once when the Sign tool mounts.
 */
export const SIGNATURE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Great+Vibes&family=Sacramento&family=Allura&family=Pinyon+Script&display=swap";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

/**
 * Read the saved signatures array from localStorage.
 * Returns an empty array if the key is absent or the stored value is invalid.
 *
 * Requirements: 4.4
 */
export function loadSavedSignatures(): SavedSignature[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape validation
    return parsed.filter(
      (item): item is SavedSignature =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.dataUrl === "string" &&
        typeof item.createdAt === "number",
    );
  } catch {
    return [];
  }
}

/**
 * Persist a new signature to localStorage.
 * If the list already has MAX_SAVED_SIGNATURES entries, the oldest one
 * (lowest createdAt) is evicted before the new one is added.
 *
 * Requirements: 4.4
 */
export function saveSignature(sig: SavedSignature): void {
  try {
    let sigs = loadSavedSignatures();

    // Replace if same id already exists (update flow)
    const existingIdx = sigs.findIndex((s) => s.id === sig.id);
    if (existingIdx !== -1) {
      sigs[existingIdx] = sig;
    } else {
      // Evict oldest if at capacity
      if (sigs.length >= MAX_SAVED_SIGNATURES) {
        sigs.sort((a, b) => a.createdAt - b.createdAt);
        sigs = sigs.slice(1); // remove oldest
      }
      sigs.push(sig);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sigs));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.)
  }
}

/**
 * Remove a saved signature by id.
 *
 * Requirements: 4.5
 */
export function deleteSignature(id: string): void {
  try {
    const sigs = loadSavedSignatures().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sigs));
  } catch {
    // ignore
  }
}

/**
 * Rename a saved signature.
 *
 * Requirements: 4.5
 */
export function renameSignature(id: string, name: string): void {
  try {
    const sigs = loadSavedSignatures().map((s) =>
      s.id === id ? { ...s, name } : s,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sigs));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// PDF application
// ---------------------------------------------------------------------------

/** Copy bytes so pdf-lib doesn't detach the original ArrayBuffer. */
function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

/**
 * Apply all SignaturePlacement[] to the PDF in a single pass.
 *
 * Each placement carries absolute PDF-point coordinates (already converted
 * by CoordinateMapper), opacity (10–100), and rotation (0–360°).
 *
 * Requirements: 4.6, 4.7, 4.8, 4.9
 */
export async function applySignatures(
  bytes: Uint8Array,
  placements: SignaturePlacement[],
  onProgress: (pct: number, label?: string) => void,
): Promise<Uint8Array> {
  if (placements.length === 0) {
    throw new Error(
      "No signatures placed. Please place at least one signature before applying.",
    );
  }

  onProgress(10, "Loading PDF…");
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const pages = pdfDoc.getPages();

  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    onProgress(
      10 + Math.round(((i + 1) / placements.length) * 80),
      `Embedding signature ${i + 1} of ${placements.length}…`,
    );

    const page = pages[placement.pageIndex];
    if (!page) {
      throw new Error(
        `Signature ${i + 1} targets page ${
          placement.pageIndex + 1
        }, which does not exist.`,
      );
    }

    // Decode the data URL
    const base64 = placement.dataUrl.split(",")[1];
    if (!base64) {
      throw new Error(`Signature ${i + 1} has an invalid data URL.`);
    }
    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const isPng = placement.dataUrl.startsWith("data:image/png");

    const image = isPng
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);

    page.drawImage(image, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      opacity: placement.opacity / 100,
      rotate: degrees(placement.rotation),
    });
  }

  onProgress(95, "Saving…");
  const result = await pdfDoc.save({ useObjectStreams: true });
  onProgress(100, "Done");
  return result;
}
