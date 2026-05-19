import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        "icon-192.svg",
        "icon-512.svg",
        "robots.txt",
      ],
      manifest: {
        name: "AuroraPDF — Zero-Server PDF Tools",
        short_name: "AuroraPDF",
        description:
          "Free, privacy-first PDF tools. Compress, convert, edit, sign, watermark and split PDFs entirely in your browser. No uploads, no accounts.",
        theme_color: "#050505",
        background_color: "#050505",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        start_url: "/",
        orientation: "any",
        categories: ["productivity", "utilities"],
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
        shortcuts: [
          {
            name: "Compress PDF",
            url: "/compress",
            description: "Reduce PDF file size",
          },
          {
            name: "OCR to PDF",
            url: "/ocr",
            description: "Extract text from images",
          },
          {
            name: "Searchable PDF OCR",
            url: "/searchable-pdf",
            description: "Make scanned PDFs searchable",
          },
          {
            name: "PDF to JPG",
            url: "/pdf-to-jpg",
            description: "Convert PDF pages to images",
          },
          {
            name: "PDF to Word",
            url: "/pdf-to-word",
            description: "Convert PDF to Word document",
          },
          {
            name: "Word to PDF",
            url: "/word-to-pdf",
            description: "Convert Word document to PDF",
          },
          {
            name: "PDF to Excel",
            url: "/pdf-to-excel",
            description: "Convert PDF to Excel spreadsheet",
          },
          {
            name: "Excel to PDF",
            url: "/excel-to-pdf",
            description: "Convert Excel spreadsheet to PDF",
          },
          {
            name: "Edit PDF",
            url: "/edit",
            description: "Edit PDF pages",
          },
          {
            name: "Sign PDF",
            url: "/sign",
            description: "Add digital signature",
          },
          {
            name: "Add Watermark",
            url: "/watermark",
            description: "Add watermark to PDF",
          },
          {
            name: "Split PDF",
            url: "/split",
            description: "Split PDF into parts",
          },
          {
            name: "Organize PDF",
            url: "/organize",
            description: "Reorder and delete PDF pages",
          },
          {
            name: "HTML to PDF",
            url: "/html-to-pdf",
            description: "Convert HTML page to PDF",
          },
          {
            name: "Protect PDF",
            url: "/protect",
            description: "Password-protect a PDF",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,wasm,mjs}"],
        // Include pdf.worker* and tesseract* in precache (removed globIgnores)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // StaleWhileRevalidate for same-origin JS/WASM chunks
            urlPattern: ({ url }: { url: URL }) =>
              url.origin === self.location.origin &&
              (url.pathname.endsWith(".js") ||
                url.pathname.endsWith(".mjs") ||
                url.pathname.endsWith(".wasm")),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "aurora-runtime",
              expiration: { maxEntries: 60 },
            },
          },
          {
            // CacheFirst for cdn.jsdelivr.net assets
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "aurora-cdn",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: false,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
    // Force a single React instance — prevents "Cannot read properties of null"
    // when @stareezy-ui/tokens (which imports React) is resolved separately.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
    // Include the tokens package so Vite pre-bundles it with the same React
    include: ["@stareezy-ui/tokens"],
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "pdf-lib": ["pdf-lib"],
          "pdfjs-dist": ["pdfjs-dist"],
          tesseract: ["tesseract.js"],
          xlsx: ["xlsx"],
          mammoth: ["mammoth"],
          docx: ["docx"],
          jszip: ["jszip"],
          html2canvas: ["html2canvas"],
        },
      },
    },
  },
});
