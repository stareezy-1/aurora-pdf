import { useEffect } from "react";
import { formatPageTitle } from "@/lib/format-utils";

const PAGE_META: Record<string, { description: string; canonical: string }> = {
  "Compress PDF": {
    description:
      "Compress PDF files online for free. Reduce PDF size without losing quality — entirely in your browser, no uploads.",
    canonical: "/compress",
  },
  "OCR: Images to PDF": {
    description:
      "Convert images to searchable PDF using OCR. Extract text from JPEG, PNG, TIFF and more — free, private, no uploads.",
    canonical: "/ocr",
  },
  "PDF to JPG": {
    description:
      "Convert PDF pages to high-resolution JPG images online. Choose 150 or 300 DPI — free, no uploads, instant download.",
    canonical: "/pdf-to-jpg",
  },
  "PDF to Word": {
    description:
      "Convert PDF to editable Word document (.docx) online for free. Preserves text structure — no uploads, runs in browser.",
    canonical: "/pdf-to-word",
  },
  "Word to PDF": {
    description:
      "Convert Word documents (.docx) to PDF online for free. Preserves formatting — no uploads, instant, private.",
    canonical: "/word-to-pdf",
  },
  "PDF to Excel": {
    description:
      "Extract tables from PDF to Excel (.xlsx) online for free. Detects tabular data automatically — no uploads required.",
    canonical: "/pdf-to-excel",
  },
  "Excel to PDF": {
    description:
      "Convert Excel spreadsheets to PDF online for free. All worksheets included — no uploads, runs entirely in browser.",
    canonical: "/excel-to-pdf",
  },
  "Edit PDF": {
    description:
      "Edit PDF files online for free. Add text, images, signatures, watermarks, reorder and delete pages — no uploads.",
    canonical: "/edit",
  },
  "Sign PDF": {
    description:
      "Sign PDF documents online for free. Draw, type or upload your signature — no uploads, 100% private and secure.",
    canonical: "/sign",
  },
  "Add Watermark": {
    description:
      "Add custom text watermarks to PDF pages online for free. Control opacity, rotation and placement — no uploads.",
    canonical: "/watermark",
  },
  "Split PDF": {
    description:
      "Split PDF files online for free. Extract specific pages or ranges — no uploads, instant download, total privacy.",
    canonical: "/split",
  },
};

const BASE_URL = "https://aurora.stareezy.tech";

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setOgMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(path: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = `${BASE_URL}${path}`;
}

export function usePageTitle(toolName?: string | null): void {
  useEffect(() => {
    if (!toolName) {
      document.title = "AuroraPDF — Free Online PDF Tools | No Upload Required";
      setMeta(
        "description",
        "AuroraPDF offers 11 free, privacy-first PDF tools — compress, convert, edit, sign, watermark and split PDFs entirely in your browser. No file uploads, no accounts.",
      );
      setOgMeta(
        "og:title",
        "AuroraPDF — Free Online PDF Tools | No Upload Required",
      );
      setOgMeta("og:url", BASE_URL + "/");
      setCanonical("/");
      return;
    }

    const title = formatPageTitle(toolName);
    document.title = title;

    const meta = PAGE_META[toolName];
    if (meta) {
      setMeta("description", meta.description);
      setOgMeta("og:title", title);
      setOgMeta("og:description", meta.description);
      setOgMeta("og:url", BASE_URL + meta.canonical);
      setCanonical(meta.canonical);
    }
  }, [toolName]);
}
