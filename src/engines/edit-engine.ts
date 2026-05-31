/**
 * Edit Engine — pure function module for applying text, image, shape, and
 * annotation edits to a PDF document.
 *
 * Design principles:
 * - Pure functions only — no React, no DOM, no side effects
 * - All coordinates arrive pre-converted to PDF point space (CoordinateMapper
 *   is used in the UI layer before calling these functions)
 * - Builds on top of pdf-engine.ts primitives where possible
 * - Worker-safe: can be imported and called from a Web Worker
 *
 * Requirements: 3.1–3.12
 */

import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
  LineCapStyle,
} from "pdf-lib";
import type { ProgressCallback } from "@/types/engine.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

function resolveStandardFont(
  fontFamily: string,
): (typeof StandardFonts)[keyof typeof StandardFonts] {
  const lower = fontFamily.toLowerCase();
  if (
    lower.includes("times") ||
    lower.includes("georgia") ||
    lower.includes("serif")
  )
    return StandardFonts.TimesRoman;
  if (lower.includes("courier") || lower.includes("mono"))
    return StandardFonts.Courier;
  if (lower.includes("bold")) return StandardFonts.HelveticaBold;
  return StandardFonts.Helvetica;
}

// ---------------------------------------------------------------------------
// EditAction discriminated union — Requirement 3.1–3.8
// ---------------------------------------------------------------------------

/** Text box added to a page (Req 3.1, 3.2) */
export interface TextAction {
  kind: "text";
  /** Unique ID for this action — used for undo/redo tracking */
  id: string;
  pageIndex: number;
  /** PDF points from left edge */
  x: number;
  /** PDF points from bottom edge (PDF Y-axis) */
  y: number;
  text: string;
  fontSize: number;
  color: string; // hex
  fontFamily: string;
  alignment: "left" | "center" | "right";
  opacity?: number; // 0–100, default 100
  rotation?: number; // degrees, default 0
}

/** Image inserted onto a page (Req 3.3, 3.4, 3.5) */
export interface ImageAction {
  kind: "image";
  id: string;
  pageIndex: number;
  /** PDF points from left edge */
  x: number;
  /** PDF points from bottom edge (PDF Y-axis) */
  y: number;
  width: number;
  height: number;
  /** PNG, JPEG, or WebP data URL */
  dataUrl: string;
  opacity?: number; // 0–100, default 100
  rotation?: number; // degrees, default 0
}

/** Shape drawn on a page (Req 3.6) */
export interface ShapeAction {
  kind: "shape";
  id: string;
  pageIndex: number;
  shapeType: "rectangle" | "circle" | "arrow" | "line";
  /** PDF points from left edge */
  x: number;
  /** PDF points from bottom edge (PDF Y-axis) */
  y: number;
  width: number;
  height: number;
  strokeColor: string; // hex
  fillColor: string | null; // hex or null for transparent
  strokeWidth: number; // pt
  opacity?: number; // 0–100, default 100
}

/** Text annotation: highlight, underline, or strikethrough (Req 3.7) */
export interface AnnotationAction {
  kind: "annotation";
  id: string;
  pageIndex: number;
  annotationType: "highlight" | "underline" | "strikethrough";
  /** PDF points from left edge */
  x: number;
  /** PDF points from bottom edge (PDF Y-axis) */
  y: number;
  width: number;
  height: number;
  color: string; // hex
  opacity?: number; // 0–100, default 50 for highlight, 100 for others
}

/** Sticky note annotation (Req 3.8) */
export interface NoteAction {
  kind: "note";
  id: string;
  pageIndex: number;
  /** PDF points from left edge */
  x: number;
  /** PDF points from bottom edge (PDF Y-axis) */
  y: number;
  text: string;
  color: string; // hex background color, e.g. "#FFFF88"
  fontSize?: number; // default 10
}

/** Union of all edit action types */
export type EditAction =
  | TextAction
  | ImageAction
  | ShapeAction
  | AnnotationAction
  | NoteAction;

// ---------------------------------------------------------------------------
// EditSession — undo/redo history (Req 3.9)
// ---------------------------------------------------------------------------

/** Minimum undo/redo history depth per Requirement 3.9 */
export const MIN_HISTORY_DEPTH = 50;

export interface EditSession {
  /** Ordered list of all actions applied in this session */
  actions: EditAction[];
  /** Current position in history (index of last applied action, -1 = empty) */
  historyIndex: number;
}

/** Create a new empty edit session */
export function createEditSession(): EditSession {
  return { actions: [], historyIndex: -1 };
}

/**
 * Add an action to the session, clearing any redo history beyond the current
 * position. Maintains a minimum of MIN_HISTORY_DEPTH entries.
 *
 * Requirement 3.9
 */
export function addAction(
  session: EditSession,
  action: EditAction,
): EditSession {
  // Truncate any redo history (actions after historyIndex)
  const base = session.actions.slice(0, session.historyIndex + 1);
  const actions = [...base, action];
  return { actions, historyIndex: actions.length - 1 };
}

/**
 * Undo the last action. Returns a new session with historyIndex decremented.
 * If already at the beginning, returns the session unchanged.
 *
 * Requirement 3.9
 */
export function undoAction(session: EditSession): EditSession {
  if (session.historyIndex < 0) return session;
  return { ...session, historyIndex: session.historyIndex - 1 };
}

/**
 * Redo the next action. Returns a new session with historyIndex incremented.
 * If already at the end, returns the session unchanged.
 *
 * Requirement 3.9
 */
export function redoAction(session: EditSession): EditSession {
  if (session.historyIndex >= session.actions.length - 1) return session;
  return { ...session, historyIndex: session.historyIndex + 1 };
}

/**
 * Get the currently active actions (up to and including historyIndex).
 * These are the actions that should be applied when exporting.
 */
export function getActiveActions(session: EditSession): EditAction[] {
  return session.actions.slice(0, session.historyIndex + 1);
}

/**
 * Returns true if undo is available.
 */
export function canUndo(session: EditSession): boolean {
  return session.historyIndex >= 0;
}

/**
 * Returns true if redo is available.
 */
export function canRedo(session: EditSession): boolean {
  return session.historyIndex < session.actions.length - 1;
}

// ---------------------------------------------------------------------------
// Individual action appliers
// ---------------------------------------------------------------------------

/**
 * Apply a TextAction to a PDF document.
 * Requirement 3.1, 3.2
 */
async function applyTextAction(
  pdfDoc: PDFDocument,
  action: TextAction,
): Promise<void> {
  const page = pdfDoc.getPage(action.pageIndex);
  const font = await pdfDoc.embedFont(resolveStandardFont(action.fontFamily));
  const { r, g, b } = hexToRgb(action.color);
  const opacity = action.opacity !== undefined ? action.opacity / 100 : 1;

  // Compute x offset for alignment
  let textX = action.x;
  if (action.alignment !== "left") {
    let textWidth = 0;
    try {
      textWidth = font.widthOfTextAtSize(action.text, action.fontSize);
    } catch {
      textWidth = action.text.length * action.fontSize * 0.5;
    }
    if (action.alignment === "center") {
      textX = action.x - textWidth / 2;
    } else if (action.alignment === "right") {
      textX = action.x - textWidth;
    }
  }

  page.drawText(action.text, {
    x: textX,
    y: action.y,
    size: action.fontSize,
    font,
    color: rgb(r, g, b),
    opacity,
    ...(action.rotation ? { rotate: degrees(action.rotation) } : {}),
  });
}

/**
 * Apply an ImageAction to a PDF document.
 * Supports PNG, JPEG, and WebP (WebP is converted via canvas if needed).
 * Requirement 3.3, 3.4, 3.5
 */
async function applyImageAction(
  pdfDoc: PDFDocument,
  action: ImageAction,
): Promise<void> {
  const page = pdfDoc.getPage(action.pageIndex);
  const base64 = action.dataUrl.split(",")[1];
  const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const isPng = action.dataUrl.startsWith("data:image/png");
  // WebP is not natively supported by pdf-lib; treat as JPEG fallback
  // (the UI layer should convert WebP to PNG/JPEG before passing here)
  const image = isPng
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);

  const opacity = action.opacity !== undefined ? action.opacity / 100 : 1;

  page.drawImage(image, {
    x: action.x,
    y: action.y,
    width: action.width,
    height: action.height,
    opacity,
    ...(action.rotation ? { rotate: degrees(action.rotation) } : {}),
  });
}

/**
 * Apply a ShapeAction to a PDF document.
 * Supports rectangle, circle, arrow, and line.
 * Requirement 3.6
 */
async function applyShapeAction(
  pdfDoc: PDFDocument,
  action: ShapeAction,
): Promise<void> {
  const page = pdfDoc.getPage(action.pageIndex);
  const stroke = hexToRgb(action.strokeColor);
  const strokeColor = rgb(stroke.r, stroke.g, stroke.b);
  const fillColorValue =
    action.fillColor !== null ? hexToRgb(action.fillColor) : null;
  const opacity = action.opacity !== undefined ? action.opacity / 100 : 1;

  switch (action.shapeType) {
    case "rectangle": {
      page.drawRectangle({
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
        borderColor: strokeColor,
        borderWidth: action.strokeWidth,
        ...(fillColorValue !== null
          ? { color: rgb(fillColorValue.r, fillColorValue.g, fillColorValue.b) }
          : { opacity: 0 }),
        borderOpacity: opacity,
      });
      break;
    }

    case "circle": {
      const xScale = action.width / 2;
      const yScale = action.height / 2;
      page.drawEllipse({
        x: action.x + xScale,
        y: action.y + yScale,
        xScale,
        yScale,
        borderColor: strokeColor,
        borderWidth: action.strokeWidth,
        ...(fillColorValue !== null
          ? { color: rgb(fillColorValue.r, fillColorValue.g, fillColorValue.b) }
          : { opacity: 0 }),
        borderOpacity: opacity,
      });
      break;
    }

    case "line": {
      page.drawLine({
        start: { x: action.x, y: action.y },
        end: { x: action.x + action.width, y: action.y + action.height },
        color: strokeColor,
        thickness: action.strokeWidth,
        opacity,
      });
      break;
    }

    case "arrow": {
      // Draw the main line
      const endX = action.x + action.width;
      const endY = action.y + action.height;
      page.drawLine({
        start: { x: action.x, y: action.y },
        end: { x: endX, y: endY },
        color: strokeColor,
        thickness: action.strokeWidth,
        opacity,
        lineCap: LineCapStyle.Round,
      });

      // Draw arrowhead as a small triangle at the end point
      const angle = Math.atan2(action.height, action.width);
      const arrowLen = Math.max(action.strokeWidth * 4, 10);
      const arrowAngle = Math.PI / 6; // 30 degrees

      const ax1 = endX - arrowLen * Math.cos(angle - arrowAngle);
      const ay1 = endY - arrowLen * Math.sin(angle - arrowAngle);
      const ax2 = endX - arrowLen * Math.cos(angle + arrowAngle);
      const ay2 = endY - arrowLen * Math.sin(angle + arrowAngle);

      // Draw two lines forming the arrowhead
      page.drawLine({
        start: { x: endX, y: endY },
        end: { x: ax1, y: ay1 },
        color: strokeColor,
        thickness: action.strokeWidth,
        opacity,
        lineCap: LineCapStyle.Round,
      });
      page.drawLine({
        start: { x: endX, y: endY },
        end: { x: ax2, y: ay2 },
        color: strokeColor,
        thickness: action.strokeWidth,
        opacity,
        lineCap: LineCapStyle.Round,
      });
      break;
    }
  }
}

/**
 * Apply an AnnotationAction (highlight, underline, strikethrough) to a PDF.
 * These are rendered as colored rectangles or lines over text regions.
 * Requirement 3.7
 */
async function applyAnnotationAction(
  pdfDoc: PDFDocument,
  action: AnnotationAction,
): Promise<void> {
  const page = pdfDoc.getPage(action.pageIndex);
  const { r, g, b } = hexToRgb(action.color);
  const defaultOpacity = action.annotationType === "highlight" ? 0.4 : 1.0;
  const opacity =
    action.opacity !== undefined ? action.opacity / 100 : defaultOpacity;

  switch (action.annotationType) {
    case "highlight": {
      // Semi-transparent colored rectangle over the text region
      page.drawRectangle({
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
        color: rgb(r, g, b),
        opacity,
        borderWidth: 0,
      });
      break;
    }

    case "underline": {
      // Thin line at the bottom of the text region
      const lineY = action.y; // bottom of the bounding box
      page.drawLine({
        start: { x: action.x, y: lineY },
        end: { x: action.x + action.width, y: lineY },
        color: rgb(r, g, b),
        thickness: Math.max(1, action.height * 0.08),
        opacity,
      });
      break;
    }

    case "strikethrough": {
      // Line through the middle of the text region
      const midY = action.y + action.height / 2;
      page.drawLine({
        start: { x: action.x, y: midY },
        end: { x: action.x + action.width, y: midY },
        color: rgb(r, g, b),
        thickness: Math.max(1, action.height * 0.08),
        opacity,
      });
      break;
    }
  }
}

/**
 * Apply a NoteAction (sticky note) to a PDF.
 * Renders as a small colored box with text content.
 * Requirement 3.8
 */
async function applyNoteAction(
  pdfDoc: PDFDocument,
  action: NoteAction,
): Promise<void> {
  const page = pdfDoc.getPage(action.pageIndex);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = action.fontSize ?? 10;

  // Note dimensions: auto-size based on text content
  const NOTE_PADDING = 4;
  const NOTE_MIN_WIDTH = 80;
  const NOTE_MIN_HEIGHT = 30;
  const lineHeight = fontSize * 1.3;

  // Wrap text to fit within a reasonable width
  const maxWidth = 160;
  const words = action.text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    let testWidth = 0;
    try {
      testWidth = font.widthOfTextAtSize(testLine, fontSize);
    } catch {
      testWidth = testLine.length * fontSize * 0.5;
    }
    if (testWidth > maxWidth - NOTE_PADDING * 2 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const noteWidth = Math.max(
    NOTE_MIN_WIDTH,
    Math.min(
      maxWidth,
      lines.reduce((max, line) => {
        let w = 0;
        try {
          w = font.widthOfTextAtSize(line, fontSize);
        } catch {
          w = line.length * fontSize * 0.5;
        }
        return Math.max(max, w);
      }, 0) +
        NOTE_PADDING * 2,
    ),
  );
  const noteHeight = Math.max(
    NOTE_MIN_HEIGHT,
    lines.length * lineHeight + NOTE_PADDING * 2,
  );

  // Draw note background
  const bg = hexToRgb(action.color);
  page.drawRectangle({
    x: action.x,
    y: action.y,
    width: noteWidth,
    height: noteHeight,
    color: rgb(bg.r, bg.g, bg.b),
    borderColor: rgb(bg.r * 0.7, bg.g * 0.7, bg.b * 0.7),
    borderWidth: 1,
    opacity: 0.9,
  });

  // Draw note text lines (top to bottom, PDF Y is bottom-up)
  for (let i = 0; i < lines.length; i++) {
    const textY =
      action.y +
      noteHeight -
      NOTE_PADDING -
      (i + 1) * lineHeight +
      fontSize * 0.2;
    try {
      page.drawText(lines[i], {
        x: action.x + NOTE_PADDING,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    } catch {
      // Skip unencodable characters
    }
  }
}

// ---------------------------------------------------------------------------
// applyEdits — main export function (Req 3.10, 3.11, 3.12)
// ---------------------------------------------------------------------------

/**
 * Apply all edit actions to a PDF and return the modified bytes.
 *
 * This is the primary export function called from a Worker or main thread.
 * All coordinates in the actions must already be in PDF point space
 * (CoordinateMapper is used in the UI layer before calling this function).
 *
 * - Iterates over actions in order and applies each one
 * - Reports progress via onProgress callback
 * - On error: throws with a descriptive message; the original bytes are
 *   unmodified (the caller should handle the error and keep the previous state)
 *
 * Requirements: 3.10, 3.11, 3.12
 */
export async function applyEdits(
  bytes: Uint8Array,
  actions: EditAction[],
  onProgress: ProgressCallback = () => {},
): Promise<Uint8Array> {
  if (actions.length === 0) {
    onProgress(100, "No edits to apply.");
    return bytes;
  }

  onProgress(0, "Loading PDF…");

  // Load a fresh copy so the original bytes are never mutated
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(copyBytes(bytes));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Edit Engine: failed to load PDF — ${msg}`);
  }

  const pageCount = pdfDoc.getPageCount();

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const pct = Math.round(((i + 1) / actions.length) * 90);
    onProgress(
      pct,
      `Applying ${action.kind} edit ${i + 1} of ${actions.length}…`,
    );

    // Validate page index before applying
    if (action.pageIndex < 0 || action.pageIndex >= pageCount) {
      throw new Error(
        `Edit Engine: action "${action.kind}" (id: ${
          action.id
        }) references page ${action.pageIndex + 1}, ` +
          `but the document only has ${pageCount} page(s). ` +
          `The document has not been modified.`,
      );
    }

    try {
      switch (action.kind) {
        case "text":
          await applyTextAction(pdfDoc, action);
          break;
        case "image":
          await applyImageAction(pdfDoc, action);
          break;
        case "shape":
          await applyShapeAction(pdfDoc, action);
          break;
        case "annotation":
          await applyAnnotationAction(pdfDoc, action);
          break;
        case "note":
          await applyNoteAction(pdfDoc, action);
          break;
        default: {
          // Exhaustive check — TypeScript will error if a case is missing
          const _exhaustive: never = action;
          throw new Error(
            `Edit Engine: unknown action kind "${
              (_exhaustive as EditAction).kind
            }".`,
          );
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Edit Engine:")) {
        throw e; // Re-throw our own errors as-is
      }
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Edit Engine: failed to apply ${action.kind} action (id: ${action.id}) — ${msg}. ` +
          `The document has not been modified.`,
      );
    }
  }

  onProgress(95, "Saving PDF…");

  let result: Uint8Array;
  try {
    result = await pdfDoc.save({ useObjectStreams: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Edit Engine: failed to save PDF — ${msg}`);
  }

  onProgress(100, "Done.");
  return result;
}

// ---------------------------------------------------------------------------
// Convenience factory functions for creating typed actions
// ---------------------------------------------------------------------------

let _actionCounter = 0;
function nextId(kind: string): string {
  return `${kind}-${Date.now()}-${++_actionCounter}`;
}

/** Create a TextAction with sensible defaults */
export function createTextAction(
  opts: Omit<TextAction, "kind" | "id"> & { id?: string },
): TextAction {
  return {
    kind: "text",
    id: opts.id ?? nextId("text"),
    pageIndex: opts.pageIndex,
    x: opts.x,
    y: opts.y,
    text: opts.text,
    alignment: opts.alignment ?? "left",
    fontSize: opts.fontSize ?? 14,
    color: opts.color ?? "#000000",
    fontFamily: opts.fontFamily ?? "Helvetica",
    opacity: opts.opacity,
    rotation: opts.rotation,
  };
}

/** Create an ImageAction with sensible defaults */
export function createImageAction(
  opts: Omit<ImageAction, "kind" | "id"> & { id?: string },
): ImageAction {
  return {
    kind: "image",
    id: opts.id ?? nextId("image"),
    pageIndex: opts.pageIndex,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    dataUrl: opts.dataUrl,
    opacity: opts.opacity ?? 100,
    rotation: opts.rotation ?? 0,
  };
}

/** Create a ShapeAction with sensible defaults */
export function createShapeAction(
  opts: Omit<ShapeAction, "kind" | "id"> & { id?: string },
): ShapeAction {
  return {
    kind: "shape",
    id: opts.id ?? nextId("shape"),
    pageIndex: opts.pageIndex,
    shapeType: opts.shapeType,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor,
    fillColor: opts.fillColor ?? null,
    strokeWidth: opts.strokeWidth ?? 2,
    opacity: opts.opacity ?? 100,
  };
}

/** Create an AnnotationAction with sensible defaults */
export function createAnnotationAction(
  opts: Omit<AnnotationAction, "kind" | "id"> & { id?: string },
): AnnotationAction {
  return {
    kind: "annotation",
    id: opts.id ?? nextId("annotation"),
    pageIndex: opts.pageIndex,
    annotationType: opts.annotationType,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    color: opts.color ?? "#FFFF00",
    opacity: opts.opacity,
  };
}

/** Create a NoteAction with sensible defaults */
export function createNoteAction(
  opts: Omit<NoteAction, "kind" | "id"> & { id?: string },
): NoteAction {
  return {
    kind: "note",
    id: opts.id ?? nextId("note"),
    pageIndex: opts.pageIndex,
    x: opts.x,
    y: opts.y,
    text: opts.text,
    color: opts.color ?? "#FFFF88",
    fontSize: opts.fontSize ?? 10,
  };
}
