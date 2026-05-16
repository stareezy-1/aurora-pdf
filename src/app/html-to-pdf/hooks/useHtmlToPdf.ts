import { useState, useTransition } from "react";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";
import { useAuroraStore } from "@/stores/aurora.store";
import { buildOutputFilename } from "@/lib/filename-utils";
import type { PageSize, Orientation } from "@/types/tool.types";
import type { SessionStatus } from "@/types/store.types";

// Page dimensions in points (1 pt = 1/72 inch)
const PAGE_SIZE_POINTS: Record<PageSize, [number, number]> = {
  A4: [595, 842],
  Letter: [612, 792],
  Legal: [612, 1008],
};

// 1 mm = 2.8346 points
const MM_TO_PT = 2.8346;

export interface HtmlToPdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HtmlToPdfConfig {
  screenWidth: number;
  pageSize: PageSize;
  orientation: Orientation;
  margins: HtmlToPdfMargins;
}

export interface HtmlToPdfViewModel {
  url: string;
  urlError: string | null;
  config: HtmlToPdfConfig;
  status: SessionStatus;
  progress: number;
  progressLabel: string;
  errorMessage: string | null;
  resultBlobUrl: string | null;
  outputFilename: string | null;
  isPending: boolean;
  setUrl: (url: string) => void;
  setConfig: (patch: Partial<HtmlToPdfConfig>) => void;
  setMargin: (side: keyof HtmlToPdfMargins, value: number) => void;
  handleConvert: () => void;
  handleReset: () => void;
  clearWorkbox: () => void;
}

const DEFAULT_CONFIG: HtmlToPdfConfig = {
  screenWidth: 1280,
  pageSize: "A4",
  orientation: "portrait",
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
};

function isValidHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Derives a filename-safe slug from a URL:
 * hostname + pathname, non-alphanumeric chars replaced with "-".
 */
function deriveSlugFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const raw = parsed.hostname + parsed.pathname;
    return raw
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  } catch {
    return "page";
  }
}

async function convertHtmlToPdf(
  url: string,
  config: HtmlToPdfConfig,
  onProgress: (progress: number, label?: string) => void,
): Promise<Uint8Array> {
  onProgress(10, "Fetching page…");

  // Try multiple CORS proxies in order
  const proxies: Array<(u: string) => string> = [
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
  ];

  let htmlContent = "";
  let lastError = "";

  for (const makeProxy of proxies) {
    try {
      const proxyUrl = makeProxy(url);
      const resp = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(12_000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const ct = resp.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const data = await resp.json();
        htmlContent = (data.contents ?? data.body ?? "") as string;
      } else {
        htmlContent = await resp.text();
      }
      if (htmlContent.trim()) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!htmlContent.trim()) {
    throw new Error(
      `Could not fetch the page. The site may block external access or all proxies are unavailable.\n\nTip: Try a simple public page like https://example.com\n(${lastError})`,
    );
  }

  onProgress(35, "Rendering page…");

  // Create a sandboxed container to render the HTML
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${config.screenWidth}px;overflow:hidden;background:#fff;`;
  container.innerHTML = htmlContent;

  // Rewrite relative URLs to absolute using the original URL as base
  try {
    const base = document.createElement("base");
    base.href = url;
    container.querySelector("head")?.prepend(base) ?? container.prepend(base);
  } catch {
    /* ignore */
  }

  document.body.appendChild(container);

  try {
    // Wait a tick for layout
    await new Promise((r) => setTimeout(r, 200));

    onProgress(50, "Capturing screenshot…");

    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      width: config.screenWidth,
      windowWidth: config.screenWidth,
      logging: false,
      backgroundColor: "#ffffff",
    });

    onProgress(70, "Building PDF…");

    const [shortSide, longSide] = PAGE_SIZE_POINTS[config.pageSize];
    const [pageWidth, pageHeight] =
      config.orientation === "portrait"
        ? [shortSide, longSide]
        : [longSide, shortSide];

    const mt = config.margins.top * MM_TO_PT;
    const mr = config.margins.right * MM_TO_PT;
    const mb = config.margins.bottom * MM_TO_PT;
    const ml = config.margins.left * MM_TO_PT;
    const contentWidth = pageWidth - ml - mr;
    const contentHeight = pageHeight - mt - mb;

    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = jpegDataUrl.split(",")[1];
    const binaryStr = atob(base64);
    const jpegBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++)
      jpegBytes[i] = binaryStr.charCodeAt(i);

    onProgress(85, "Embedding in PDF…");

    const pdfDoc = await PDFDocument.create();
    const jpegImage = await pdfDoc.embedJpg(jpegBytes);

    // The captured canvas may be very tall — split into multiple pages
    const imgPtWidth = contentWidth;
    const imgPtHeight = (canvas.height / canvas.width) * contentWidth;
    const pagesNeeded = Math.ceil(imgPtHeight / contentHeight);

    for (let p = 0; p < pagesNeeded; p++) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const yOffset = p * contentHeight;
      page.drawImage(jpegImage, {
        x: ml,
        y: pageHeight - mt - Math.min(contentHeight, imgPtHeight - yOffset),
        width: imgPtWidth,
        height: imgPtHeight,
      });
    }

    onProgress(95, "Finalising…");
    const pdfBytes = await pdfDoc.save();
    onProgress(100, "Done");
    return pdfBytes;
  } finally {
    if (document.body.contains(container)) document.body.removeChild(container);
  }
}

export function useHtmlToPdf(): HtmlToPdfViewModel {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    setComplete,
    failSession,
    updateProgress,
    clearWorkbox,
  } = useAuroraStore();

  const [url, setUrlState] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [config, setConfigState] = useState<HtmlToPdfConfig>(DEFAULT_CONFIG);
  const [isPending, startTransition] = useTransition();

  function setUrl(value: string) {
    setUrlState(value);
    if (value === "") {
      setUrlError(null);
    } else if (!isValidHttpsUrl(value)) {
      setUrlError(
        "Only HTTPS URLs are supported. Please enter a URL starting with https://",
      );
    } else {
      setUrlError(null);
    }
  }

  function setConfig(patch: Partial<HtmlToPdfConfig>) {
    setConfigState((prev) => ({ ...prev, ...patch }));
  }

  function setMargin(side: keyof HtmlToPdfMargins, value: number) {
    setConfigState((prev) => ({
      ...prev,
      margins: { ...prev.margins, [side]: value },
    }));
  }

  function handleConvert() {
    if (!isValidHttpsUrl(url)) {
      setUrlError(
        "Only HTTPS URLs are supported. Please enter a URL starting with https://",
      );
      return;
    }

    // Clear any previous workbox state before starting
    clearWorkbox();

    startTransition(async () => {
      try {
        const onProgress = (p: number, label?: string) => {
          updateProgress(p, label);
        };

        const pdfBytes = await convertHtmlToPdf(url, config, onProgress);

        const slug = deriveSlugFromUrl(url);
        const filename = buildOutputFilename(slug, "html-to-pdf");
        const blob = new Blob([new Uint8Array(pdfBytes)], {
          type: "application/pdf",
        });
        setComplete(blob, filename);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during conversion.";
        failSession(message);
      }
    });
  }

  function handleReset() {
    clearWorkbox();
    setUrlState("");
    setUrlError(null);
    setConfigState(DEFAULT_CONFIG);
  }

  return {
    url,
    urlError,
    config,
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    isPending,
    setUrl,
    setConfig,
    setMargin,
    handleConvert,
    handleReset,
    clearWorkbox,
  };
}
