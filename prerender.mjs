/**
 * prerender.mjs
 *
 * Static prerender script for AuroraPDF.
 * Runs after `vite build` to inject per-route metadata into the built index.html,
 * creating individual HTML files for each route so Google can crawl real content.
 *
 * Usage: node prerender.mjs  (called automatically by `npm run build`)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist");
const BASE_URL = "https://aurora.stareezy.tech";

// ── Per-route metadata ────────────────────────────────────────────────────

const ROUTES = [
  {
    path: "/",
    title: "AuroraPDF — 15 Free Online PDF Tools | No Upload Required",
    description:
      "AuroraPDF offers 15 free, privacy-first PDF tools — compress, convert, edit, sign, watermark, split, OCR and more. Everything runs 100% in your browser. No file uploads, no accounts, no limits.",
    keywords:
      "PDF tools, free PDF tools, online PDF, compress PDF, edit PDF, sign PDF, OCR PDF, no upload PDF, privacy PDF, browser PDF",
    h1: "Free Online PDF Tools — No Upload Required",
    intro:
      "15 powerful PDF utilities that run entirely in your browser. Compress, convert, edit, sign, watermark, split, OCR and more. Your files never leave your device.",
  },
  {
    path: "/compress",
    title: "Compress PDF Online Free — Reduce PDF Size | AuroraPDF",
    description:
      "Compress PDF files online for free. Reduce PDF file size by up to 70% without losing quality — runs entirely in your browser, no uploads, no account needed.",
    keywords:
      "compress PDF, reduce PDF size, PDF compressor, shrink PDF, PDF optimizer, free PDF compressor",
    h1: "Compress PDF — Reduce File Size Online",
    intro:
      "Reduce your PDF file size by up to 70% with three compression levels. All processing happens locally in your browser — your file never leaves your device.",
  },
  {
    path: "/ocr",
    title: "OCR: Images to PDF Online Free — Extract Text | AuroraPDF",
    description:
      "Convert images to searchable PDF using OCR. Extract text from JPEG, PNG, TIFF, BMP and WebP — free, private, no uploads, powered by Tesseract.js.",
    keywords:
      "OCR PDF, image to PDF, extract text from image, OCR online, JPEG to PDF, PNG to PDF, Tesseract OCR",
    h1: "OCR: Convert Images to Searchable PDF",
    intro:
      "Extract text from JPEG, PNG, TIFF, BMP and WebP images and create a searchable PDF. Powered by Tesseract.js — runs entirely offline in your browser.",
  },
  {
    path: "/searchable-pdf",
    title: "Searchable PDF OCR — Make Scanned PDFs Searchable | AuroraPDF",
    description:
      "Make scanned PDFs searchable and selectable. Our offline OCR engine adds an invisible text layer to image-based PDFs — no uploads, 100% private, works offline.",
    keywords:
      "searchable PDF, OCR scanned PDF, make PDF searchable, PDF text layer, offline OCR, Tesseract PDF",
    h1: "Searchable PDF OCR — Make Scanned PDFs Searchable",
    intro:
      "Convert scanned or image-based PDFs into fully searchable, selectable documents. An invisible text layer is added using Tesseract.js OCR — entirely offline.",
  },
  {
    path: "/pdf-to-jpg",
    title: "PDF to JPG Online Free — Convert PDF Pages to Images | AuroraPDF",
    description:
      "Convert PDF pages to high-resolution JPG images online for free. Choose 150 or 300 DPI output — no uploads, instant download, runs in your browser.",
    keywords:
      "PDF to JPG, PDF to image, convert PDF to JPEG, PDF page to image, free PDF to JPG",
    h1: "PDF to JPG — Convert PDF Pages to Images",
    intro:
      "Convert every page of your PDF to a high-resolution JPEG image. Choose 150 or 300 DPI. No uploads — everything runs in your browser.",
  },
  {
    path: "/pdf-to-word",
    title: "PDF to Word Online Free — Convert PDF to DOCX | AuroraPDF",
    description:
      "Convert PDF to editable Word document (.docx) online for free. Preserves text structure and layout — no uploads, runs entirely in your browser.",
    keywords:
      "PDF to Word, PDF to DOCX, convert PDF to Word, PDF to editable document, free PDF converter",
    h1: "PDF to Word — Convert PDF to Editable DOCX",
    intro:
      "Extract text and structure from your PDF into an editable Word (.docx) document. No uploads, no server — runs entirely in your browser.",
  },
  {
    path: "/word-to-pdf",
    title: "Word to PDF Online Free — Convert DOCX to PDF | AuroraPDF",
    description:
      "Convert Word documents (.docx, .doc) to PDF online for free. Preserves formatting and fonts — no uploads, instant, 100% private.",
    keywords:
      "Word to PDF, DOCX to PDF, convert Word to PDF, DOC to PDF, free Word PDF converter",
    h1: "Word to PDF — Convert DOCX to PDF Online",
    intro:
      "Convert Word documents (.docx) to universally readable PDF files. Formatting and fonts are preserved. No uploads — runs in your browser.",
  },
  {
    path: "/pdf-to-excel",
    title: "PDF to Excel Online Free — Extract Tables to XLSX | AuroraPDF",
    description:
      "Extract tables from PDF to Excel (.xlsx) online for free. Automatically detects tabular data — no uploads, runs in your browser, instant download.",
    keywords:
      "PDF to Excel, PDF to XLSX, extract table from PDF, PDF to spreadsheet, free PDF to Excel",
    h1: "PDF to Excel — Extract Tables from PDF",
    intro:
      "Automatically detect and extract tables from your PDF into an editable Excel (.xlsx) spreadsheet. No uploads — runs entirely in your browser.",
  },
  {
    path: "/excel-to-pdf",
    title: "Excel to PDF Online Free — Convert XLSX to PDF | AuroraPDF",
    description:
      "Convert Excel spreadsheets (.xlsx, .xls) to PDF online for free. All worksheets included — no uploads, runs entirely in your browser.",
    keywords:
      "Excel to PDF, XLSX to PDF, convert spreadsheet to PDF, XLS to PDF, free Excel PDF converter",
    h1: "Excel to PDF — Convert Spreadsheets to PDF",
    intro:
      "Convert Excel spreadsheets (.xlsx) to fixed, print-ready PDF files. All worksheets are included. No uploads — runs in your browser.",
  },
  {
    path: "/html-to-pdf",
    title: "HTML to PDF Online Free — Convert Webpage to PDF | AuroraPDF",
    description:
      "Convert any HTTPS webpage to a PDF online for free. Rendered locally in your browser with custom page size, orientation and margins — no server required.",
    keywords:
      "HTML to PDF, webpage to PDF, URL to PDF, convert website to PDF, free HTML PDF converter",
    h1: "HTML to PDF — Convert Webpages to PDF",
    intro:
      "Convert any public HTTPS webpage to a PDF with custom page size, orientation and margins. Rendered locally in your browser — no server required.",
  },
  {
    path: "/edit",
    title: "Edit PDF Online Free — Add Text, Images & Signatures | AuroraPDF",
    description:
      "Edit PDF files online for free. Add text, images, signatures and watermarks, reorder and delete pages — full editor, no uploads, runs in your browser.",
    keywords:
      "edit PDF, PDF editor, add text to PDF, annotate PDF, PDF page editor, free PDF editor online",
    h1: "Edit PDF — Full PDF Editor Online",
    intro:
      "Add text, images, signatures and watermarks to any PDF. Reorder and delete pages. Full editor — no uploads, runs entirely in your browser.",
  },
  {
    path: "/sign",
    title: "Sign PDF Online Free — Add Digital Signature | AuroraPDF",
    description:
      "Sign PDF documents online for free. Draw, type or upload your signature and embed it on any page — no uploads, 100% private and secure.",
    keywords:
      "sign PDF, PDF signature, digital signature PDF, e-sign PDF, draw signature PDF, free PDF signer",
    h1: "Sign PDF — Add Digital Signature Online",
    intro:
      "Draw, type or upload your signature and embed it on any page of your PDF. No uploads — 100% private and secure, runs in your browser.",
  },
  {
    path: "/watermark",
    title: "Add Watermark to PDF Online Free | AuroraPDF",
    description:
      "Add custom text watermarks to every page of your PDF online for free. Control font, opacity, rotation and placement — no uploads, instant preview.",
    keywords:
      "watermark PDF, add watermark to PDF, PDF watermark tool, text watermark PDF, free PDF watermark",
    h1: "Add Watermark to PDF — Custom Text Watermarks",
    intro:
      "Apply a custom text watermark to every page of your PDF. Control font, size, opacity, rotation and placement. No uploads — instant live preview.",
  },
  {
    path: "/split",
    title: "Split PDF Online Free — Extract Pages from PDF | AuroraPDF",
    description:
      "Split PDF files online for free. Extract specific pages or custom page ranges into a new PDF — no uploads, instant download, total privacy.",
    keywords:
      "split PDF, extract PDF pages, PDF splitter, separate PDF pages, free PDF splitter online",
    h1: "Split PDF — Extract Pages Online",
    intro:
      "Extract specific pages or custom page ranges from your PDF into a new file. No uploads — instant download, total privacy.",
  },
  {
    path: "/organize",
    title: "Organize PDF Online Free — Reorder & Delete Pages | AuroraPDF",
    description:
      "Reorder, rotate, duplicate and delete PDF pages online for free. Drag-and-drop interface with bulk actions — no uploads, runs in your browser.",
    keywords:
      "organize PDF, reorder PDF pages, rotate PDF pages, delete PDF pages, PDF page organizer, free PDF organizer",
    h1: "Organize PDF — Reorder, Rotate & Delete Pages",
    intro:
      "Drag and drop to reorder pages, rotate, duplicate or delete them. Bulk actions included. No uploads — runs entirely in your browser.",
  },
  {
    path: "/protect",
    title: "Protect PDF Online Free — Password Encrypt PDF | AuroraPDF",
    description:
      "Encrypt your PDF with a password online for free. Restrict unauthorized access with AES-256 encryption — no uploads, 100% private, runs in your browser.",
    keywords:
      "protect PDF, password protect PDF, encrypt PDF, PDF password, secure PDF, free PDF encryption",
    h1: "Protect PDF — Password Encrypt Your PDF",
    intro:
      "Add AES-256 password encryption to your PDF to restrict unauthorized access. No uploads — 100% private, runs entirely in your browser.",
  },
];

// ── Read the built index.html ─────────────────────────────────────────────

const template = readFileSync(join(DIST, "index.html"), "utf-8");

// ── Generate per-route HTML ───────────────────────────────────────────────

for (const route of ROUTES) {
  const { path, title, description, keywords, h1, intro } = route;

  // Build the canonical URL
  const canonical = path === "/" ? BASE_URL + "/" : BASE_URL + path;

  // Inject metadata into the template
  let html = template
    // Title
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    // Description
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${escapeHtml(description)}$2`,
    )
    // Keywords
    .replace(
      /(<meta\s+name="keywords"\s+content=")[^"]*(")/,
      `$1${escapeHtml(keywords)}$2`,
    )
    // Canonical
    .replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${escapeHtml(canonical)}$2`,
    )
    // OG title
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${escapeHtml(title)}$2`,
    )
    // OG description
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${escapeHtml(description)}$2`,
    )
    // OG URL
    .replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${escapeHtml(canonical)}$2`,
    )
    // Twitter title
    .replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      `$1${escapeHtml(title)}$2`,
    )
    // Twitter description
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
      `$1${escapeHtml(description)}$2`,
    );

  // Inject a static content shell into <div id="root"> so crawlers see real text.
  // React will hydrate over this on the client side.
  const staticShell = buildStaticShell(h1, intro, route.path);
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${staticShell}</div>`,
  );

  // Write the file
  if (path === "/") {
    writeFileSync(join(DIST, "index.html"), html, "utf-8");
    console.log(`✓ /  →  dist/index.html`);
  } else {
    const dir = join(DIST, path.slice(1)); // strip leading /
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html, "utf-8");
    console.log(`✓ ${path}  →  dist${path}/index.html`);
  }
}

console.log(`\n✅ Prerendered ${ROUTES.length} routes.`);

// ── Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Builds a minimal static HTML shell that crawlers can read.
 * React will replace this with the real app on hydration.
 */
function buildStaticShell(h1, intro, path) {
  const isHome = path === "/";

  const toolLinks = isHome
    ? `<nav aria-label="PDF Tools">
        <ul>
          <li><a href="/compress">Compress PDF</a></li>
          <li><a href="/ocr">OCR: Images to PDF</a></li>
          <li><a href="/searchable-pdf">Searchable PDF OCR</a></li>
          <li><a href="/pdf-to-jpg">PDF to JPG</a></li>
          <li><a href="/pdf-to-word">PDF to Word</a></li>
          <li><a href="/word-to-pdf">Word to PDF</a></li>
          <li><a href="/pdf-to-excel">PDF to Excel</a></li>
          <li><a href="/excel-to-pdf">Excel to PDF</a></li>
          <li><a href="/html-to-pdf">HTML to PDF</a></li>
          <li><a href="/edit">Edit PDF</a></li>
          <li><a href="/sign">Sign PDF</a></li>
          <li><a href="/watermark">Add Watermark</a></li>
          <li><a href="/split">Split PDF</a></li>
          <li><a href="/organize">Organize PDF</a></li>
          <li><a href="/protect">Protect PDF</a></li>
        </ul>
      </nav>`
    : `<nav aria-label="Breadcrumb"><a href="/">Home</a> › ${escapeHtml(
        h1,
      )}</nav>`;

  return `
    <header>
      <a href="/" aria-label="AuroraPDF Home">AuroraPDF</a>
    </header>
    <main>
      <h1>${escapeHtml(h1)}</h1>
      <p>${escapeHtml(intro)}</p>
      <p>✓ Free &nbsp;·&nbsp; No uploads &nbsp;·&nbsp; No account &nbsp;·&nbsp; 100% private</p>
      ${toolLinks}
    </main>
  `;
}
