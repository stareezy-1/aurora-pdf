import { useEffect } from "react";
import { formatPageTitle } from "@/lib/format-utils";

const BASE_URL = "https://aurora.stareezy.tech";

/**
 * Per-tool SEO metadata.
 * Descriptions are 140–160 chars, keyword-rich, and include the privacy USP.
 */
const PAGE_META: Record<
  string,
  { description: string; canonical: string; keywords: string }
> = {
  "Compress PDF": {
    description:
      "Compress PDF files online for free. Reduce PDF file size by up to 70% without losing quality — runs entirely in your browser, no uploads, no account needed.",
    canonical: "/compress",
    keywords:
      "compress PDF, reduce PDF size, PDF compressor, shrink PDF, PDF optimizer, free PDF compressor",
  },
  "OCR: Images to PDF": {
    description:
      "Convert images to searchable PDF using OCR. Extract text from JPEG, PNG, TIFF, BMP and WebP — free, private, no uploads, powered by Tesseract.js.",
    canonical: "/ocr",
    keywords:
      "OCR PDF, image to PDF, extract text from image, OCR online, JPEG to PDF, PNG to PDF, Tesseract OCR",
  },
  "Searchable PDF OCR": {
    description:
      "Make scanned PDFs searchable and selectable. Our offline OCR engine adds an invisible text layer to image-based PDFs — no uploads, 100% private, works offline.",
    canonical: "/searchable-pdf",
    keywords:
      "searchable PDF, OCR scanned PDF, make PDF searchable, PDF text layer, offline OCR, Tesseract PDF",
  },
  "PDF to JPG": {
    description:
      "Convert PDF pages to high-resolution JPG images online for free. Choose 150 or 300 DPI output — no uploads, instant download, runs in your browser.",
    canonical: "/pdf-to-jpg",
    keywords:
      "PDF to JPG, PDF to image, convert PDF to JPEG, PDF page to image, free PDF to JPG",
  },
  "PDF to Word": {
    description:
      "Convert PDF to editable Word document (.docx) online for free. Preserves text structure and layout — no uploads, runs entirely in your browser.",
    canonical: "/pdf-to-word",
    keywords:
      "PDF to Word, PDF to DOCX, convert PDF to Word, PDF to editable document, free PDF converter",
  },
  "Word to PDF": {
    description:
      "Convert Word documents (.docx, .doc) to PDF online for free. Preserves formatting and fonts — no uploads, instant, 100% private.",
    canonical: "/word-to-pdf",
    keywords:
      "Word to PDF, DOCX to PDF, convert Word to PDF, DOC to PDF, free Word PDF converter",
  },
  "PDF to Excel": {
    description:
      "Extract tables from PDF to Excel (.xlsx) online for free. Automatically detects tabular data — no uploads, runs in your browser, instant download.",
    canonical: "/pdf-to-excel",
    keywords:
      "PDF to Excel, PDF to XLSX, extract table from PDF, PDF to spreadsheet, free PDF to Excel",
  },
  "Excel to PDF": {
    description:
      "Convert Excel spreadsheets (.xlsx, .xls) to PDF online for free. All worksheets included — no uploads, runs entirely in your browser.",
    canonical: "/excel-to-pdf",
    keywords:
      "Excel to PDF, XLSX to PDF, convert spreadsheet to PDF, XLS to PDF, free Excel PDF converter",
  },
  "HTML to PDF": {
    description:
      "Convert any HTTPS webpage to a PDF online for free. Rendered locally in your browser with custom page size, orientation and margins — no server required.",
    canonical: "/html-to-pdf",
    keywords:
      "HTML to PDF, webpage to PDF, URL to PDF, convert website to PDF, free HTML PDF converter",
  },
  "Edit PDF": {
    description:
      "Edit PDF files online for free. Add text, images, signatures and watermarks, reorder and delete pages — full editor, no uploads, runs in your browser.",
    canonical: "/edit",
    keywords:
      "edit PDF, PDF editor, add text to PDF, annotate PDF, PDF page editor, free PDF editor online",
  },
  "Sign PDF": {
    description:
      "Sign PDF documents online for free. Draw, type or upload your signature and embed it on any page — no uploads, 100% private and secure.",
    canonical: "/sign",
    keywords:
      "sign PDF, PDF signature, digital signature PDF, e-sign PDF, draw signature PDF, free PDF signer",
  },
  "Add Watermark": {
    description:
      "Add custom text watermarks to every page of your PDF online for free. Control font, opacity, rotation and placement — no uploads, instant preview.",
    canonical: "/watermark",
    keywords:
      "watermark PDF, add watermark to PDF, PDF watermark tool, text watermark PDF, free PDF watermark",
  },
  "Split PDF": {
    description:
      "Split PDF files online for free. Extract specific pages or custom page ranges into a new PDF — no uploads, instant download, total privacy.",
    canonical: "/split",
    keywords:
      "split PDF, extract PDF pages, PDF splitter, separate PDF pages, free PDF splitter online",
  },
  "Organize PDF": {
    description:
      "Reorder, rotate, duplicate and delete PDF pages online for free. Drag-and-drop interface with bulk actions — no uploads, runs in your browser.",
    canonical: "/organize",
    keywords:
      "organize PDF, reorder PDF pages, rotate PDF pages, delete PDF pages, PDF page organizer, free PDF organizer",
  },
  "Protect PDF": {
    description:
      "Encrypt your PDF with a password online for free. Restrict unauthorized access with AES-256 encryption — no uploads, 100% private, runs in your browser.",
    canonical: "/protect",
    keywords:
      "protect PDF, password protect PDF, encrypt PDF, PDF password, secure PDF, free PDF encryption",
  },
};

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

function setTwitterMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
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
      const homeTitle =
        "AuroraPDF — 15 Free Online PDF Tools | No Upload Required";
      const homeDesc =
        "AuroraPDF offers 15 free, privacy-first PDF tools — compress, convert, edit, sign, watermark, split, OCR and more. Everything runs 100% in your browser. No file uploads, no accounts.";
      document.title = homeTitle;
      setMeta("description", homeDesc);
      setMeta(
        "keywords",
        "PDF tools, free PDF tools, online PDF, compress PDF, edit PDF, sign PDF, OCR PDF, no upload PDF, privacy PDF, browser PDF",
      );
      setOgMeta("og:title", homeTitle);
      setOgMeta("og:description", homeDesc);
      setOgMeta("og:url", BASE_URL + "/");
      setTwitterMeta("twitter:title", homeTitle);
      setTwitterMeta("twitter:description", homeDesc);
      setCanonical("/");
      return;
    }

    const title = formatPageTitle(toolName);
    document.title = title;

    const meta = PAGE_META[toolName];
    if (meta) {
      setMeta("description", meta.description);
      setMeta("keywords", meta.keywords);
      setOgMeta("og:title", title);
      setOgMeta("og:description", meta.description);
      setOgMeta("og:url", BASE_URL + meta.canonical);
      setTwitterMeta("twitter:title", title);
      setTwitterMeta("twitter:description", meta.description);
      setCanonical(meta.canonical);
    }
  }, [toolName]);
}
