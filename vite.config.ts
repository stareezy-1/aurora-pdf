import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
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
          { name: "Edit PDF", url: "/edit", description: "Edit PDF pages" },
          {
            name: "Sign PDF",
            url: "/sign",
            description: "Add digital signature",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Don't cache heavy WASM/worker files — they're too large and change often
        globIgnores: ["**/pdf.worker*", "**/tesseract*"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
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
