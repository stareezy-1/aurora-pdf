# AuroraPDF

A high-performance, client-side PDF utility suite. Every file operation runs entirely in your browser — nothing is ever uploaded to a server.

## Tools

| Tool               | Route           | Output                                        |
| ------------------ | --------------- | --------------------------------------------- |
| Compress PDF       | `/compress`     | `{name}_compressed.pdf`                       |
| OCR: Images to PDF | `/ocr`          | `ocr-output.pdf`                              |
| PDF to JPG         | `/pdf-to-jpg`   | `{name}_pages.zip` / `{name}_page1.jpg`       |
| PDF to Word        | `/pdf-to-word`  | `{name}.docx`                                 |
| Word to PDF        | `/word-to-pdf`  | `{name}.pdf`                                  |
| PDF to Excel       | `/pdf-to-excel` | `{name}.xlsx`                                 |
| Excel to PDF       | `/excel-to-pdf` | `{name}.pdf`                                  |
| Edit PDF           | `/edit`         | `{name}_edited.pdf`                           |
| Sign PDF           | `/sign`         | `{name}_signed.pdf`                           |
| Add Watermark      | `/watermark`    | `{name}_watermarked.pdf`                      |
| Split PDF          | `/split`        | `{name}_split.pdf` / `{name}_split_parts.zip` |

## Tech Stack

| Concern                 | Library                                |
| ----------------------- | -------------------------------------- |
| Framework               | React 19.2.0 + Vite 6                  |
| Language                | TypeScript 5.7, strict mode            |
| Routing                 | React Router v7 (lazy-loaded routes)   |
| State                   | Zustand 5 (`useAuroraStore`)           |
| PDF manipulation        | pdf-lib 1.17.1                         |
| PDF rendering / parsing | pdfjs-dist 4.4.168                     |
| OCR                     | Tesseract.js 5.1.1                     |
| Word conversion         | Mammoth 1.8.0 + docx 8.5.0             |
| Spreadsheet conversion  | SheetJS (xlsx 0.18.5)                  |
| ZIP packaging           | JSZip 3.10.1                           |
| Design system           | @stareezy-ui/tokens + components       |
| Testing                 | Vitest 3 + fast-check (property-based) |
| PWA                     | vite-plugin-pwa + Workbox              |

## Privacy Model

All processing happens in browser memory (RAM). Files are held as `File`, `Blob`, or `ArrayBuffer` objects — never written to `localStorage`, `sessionStorage`, `IndexedDB`, or any server.

The central cleanup function is `useAuroraStore.clearWorkbox()` — the "digital shredder". It revokes the output Blob URL and resets all in-memory file state. It runs automatically:

- before every new file load (`setNewFile`)
- within 3 seconds of a download completing
- on any engine error (`failSession`)
- on navigation away from a tool page
- on `beforeunload`

The only value persisted to `localStorage` is the theme preference under the key `aurora-pdf-theme`.

## State Management

A single Zustand store — `useAuroraStore` — manages all global state:

```ts
activeFile; // File | null
resultBlobUrl; // string | null
status; // 'idle' | 'processing' | 'success' | 'error'
progress; // 0–100
progressLabel; // human-readable progress string
sessionId; // uuid v4, reset on each new file
errorMessage; // string | null
outputFilename; // string | null
theme; // 'light' | 'dark' (default: 'dark')
toolConfig; // per-tool configuration
```

React 19 patterns used throughout:

- `useTransition` wraps all engine calls to keep the UI responsive
- `useOptimistic` drives the progress bar so it never appears frozen
- `<Suspense>` gates tool page loading with skeleton placeholders

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build

# Type-check
npm run typecheck

# Run tests (single pass)
npm test
```

## Project Structure

```
aurora-pdf/
├── src/
│   ├── app/              # Route-level page components (one folder per tool)
│   ├── components/       # Shared UI (FileDropZone, ProgressPanel, NavBar, …)
│   ├── engines/          # pdf-engine.ts, ocr-engine.ts, conversion-engine.ts
│   ├── stores/           # aurora.store.ts — useAuroraStore
│   ├── hooks/            # useFileProcessor, usePageTitle, usePwaInstall
│   ├── lib/              # file-validator, zip-helper, filename-utils, format-utils
│   └── types/            # store.types.ts, tool.types.ts, engine.types.ts
├── __tests__/
│   └── properties/       # Property-based tests (Vitest + fast-check)
├── public/               # PWA assets, manifest, service worker
├── SECURITY.md           # Third-party library audit
└── vite.config.ts
```

## Aurora Theme

The app uses a custom design token set registered via `createUi()` from `@stareezy-ui/tokens`:

| Token                 | Value     | Usage                              |
| --------------------- | --------- | ---------------------------------- |
| `aurora.deepSpace`    | `#050505` | Primary background                 |
| `aurora.auroraGreen`  | `#00ff88` | Primary accent, CTAs, progress bar |
| `aurora.starWhite`    | `#ffffff` | Primary text                       |
| `aurora.nebulaPurple` | `#7c3aed` | Secondary accent                   |
| `aurora.cosmicGray`   | `#1a1a2e` | Card / surface background          |

Default theme is dark. The user can toggle via the `ThemeToggle` component in the NavBar.

## Security

See [SECURITY.md](./SECURITY.md) for the full third-party library audit, including pinned versions and verified network behavior for each processing dependency.
