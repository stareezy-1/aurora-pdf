import { useState, useRef, useCallback } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  embedSignature,
  getPageCount,
  renderPagePreview,
} from "@/engines/pdf-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import { SignatureImageTooLargeError } from "@/lib/errors";
import type { SignatureMethod } from "@/types/tool.types";

const MAX_SIG_MB = 5;

export interface SigOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useSignPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);
  const [method, setMethod] = useState<SignatureMethod>("draw");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [overlay, setOverlay] = useState<SigOverlay>({
    x: 60,
    y: 400,
    width: 200,
    height: 80,
  });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      if (!sigDataUrl) throw new Error("No signature provided.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      onProgress(30, "Embedding signature…");
      const previewImg = document.querySelector(
        ".editor-page-wrap img",
      ) as HTMLImageElement | null;
      const imgW = previewImg?.naturalWidth ?? 595;
      const imgH = previewImg?.naturalHeight ?? 842;
      const dispW = previewImg?.clientWidth ?? imgW;
      const dispH = previewImg?.clientHeight ?? imgH;
      const scaleX = imgW / dispW;
      const scaleY = imgH / dispH;
      const result = await embedSignature(bytes, {
        method,
        dataUrl: sigDataUrl,
        typedName: typedName || null,
        pageIndex,
        x: (overlay.x * scaleX) / imgW,
        y: (overlay.y * scaleY) / imgH,
        width: (overlay.width * scaleX) / imgW,
        height: (overlay.height * scaleY) / imgH,
      });
      onProgress(100);
      return {
        blob: new Blob([result], { type: "application/pdf" }),
        filename: buildOutputFilename(file.name, "sign"),
      };
    },
  });

  async function handlePdfDrop(files: File[]) {
    const file = files[0];
    setPdfFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
    const n = await getPageCount(bytes);
    setPageCount(n);
    setPageIndex(0);
    const previews: string[] = [];
    for (let i = 0; i < Math.min(n, 20); i++) {
      previews.push(await renderPagePreview(bytes, i));
    }
    setPagePreviews(previews);
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function endDraw() {
    setIsDrawing(false);
    setSigDataUrl(canvasRef.current?.toDataURL("image/png") ?? null);
  }

  function renderTypedSig() {
    const canvas = canvasRef.current;
    if (!canvas || !typedName) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '38px Georgia, "Times New Roman", serif';
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(typedName, 12, 56);
    setSigDataUrl(canvas.toDataURL("image/png"));
  }

  function handleSigImageDrop(files: File[]) {
    const file = files[0];
    if (file.size > MAX_SIG_MB * 1024 * 1024) {
      useAuroraStore
        .getState()
        .failSession(new SignatureImageTooLargeError().message);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setSigDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current)
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSigDataUrl(null);
  }

  const startOverlayDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: overlay.x,
        origY: overlay.y,
      };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        setOverlay((prev) => ({
          ...prev,
          x: dragRef.current!.origX + ev.clientX - dragRef.current!.startX,
          y: dragRef.current!.origY + ev.clientY - dragRef.current!.startY,
        }));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [overlay],
  );

  const startOverlayResize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: overlay.width,
        origH: overlay.height,
      };
      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        setOverlay((prev) => ({
          ...prev,
          width: Math.max(
            60,
            resizeRef.current!.origW + ev.clientX - resizeRef.current!.startX,
          ),
          height: Math.max(
            30,
            resizeRef.current!.origH + ev.clientY - resizeRef.current!.startY,
          ),
        }));
      };
      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [overlay],
  );

  function handleReset() {
    clearWorkbox();
    setPdfFile(null);
    setPdfBytes(null);
    setPagePreviews([]);
    setSigDataUrl(null);
  }

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    pdfFile,
    pageCount,
    pageIndex,
    setPageIndex,
    pagePreviews,
    method,
    setMethod,
    sigDataUrl,
    setSigDataUrl,
    typedName,
    setTypedName,
    canvasRef,
    isDrawing,
    overlay,
    processor,
    handlePdfDrop,
    startDraw,
    draw,
    endDraw,
    renderTypedSig,
    handleSigImageDrop,
    clearCanvas,
    startOverlayDrag,
    startOverlayResize,
    handleReset,
    MAX_SIG_MB,
  };
}
