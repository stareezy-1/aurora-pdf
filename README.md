# AuroraPDF

<p align="center">
  <strong>Free, private, client-side PDF tools — no uploads, no accounts, no limits.</strong>
</p>

<p align="center">
  Every file operation runs entirely in your browser. Your documents never leave your device.
</p>

<p align="center">
  <a href="https://github.com/stareezy-1/aurora-pdf/actions"><img src="https://github.com/stareezy-1/aurora-pdf/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/React-19-blue" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PWA-ready-brightgreen" alt="PWA" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
</p>

---

## Why AuroraPDF?

Most online PDF tools upload your files to a server. AuroraPDF doesnand is gone the moment you close the tab.

This is not a marketing claim. It is a verifiable architectural consutbound requests to external URLs.

---

## Tools

| Tool               | Route             | Output                                        |
| ------------------ | ----------------- | --------------------------------------------- |
| Compress PDF       | `/compress`       | `{name}_compressed.pdf`                       |
| OCR: Images to PDF | `/ocr`            | `ocr-output.pdf`                              |
| Searchable PDF     | `/searchable-pdf` | `{name}_searchable.pdf`                       |
| PDF to JPG         | `/pdf-to-jpg`     | `{name}_pages.zip` / `{name}_page1.jpg`       |
| PDF to Word        | `/pdf-to-word`    | `{name}.docx`                                 |
| Word to PDF        | `/word-to-pdf`    | `{name}.pdf`                                  |
| PDF to Excel       | `/pdf-to-excel`   | `{name}.xlsx`                                 |
| pdf`               | `{name}.pdf`      |
| Edit PDF           | `/edit`           | `{name}_edited.pdf`                           |
| Sign PDF           | `/sign`           | `{name}_signed.pdf`                           |
| Add Watermark      | `/watermark`      | `{name}_watermarked.pdf`                      |
| Split PDF          | `/split`          | `{name}_split.pdf` / `{name}_split_parts.zip` |
| Organize PDF       | `/organize`       | `{name}_organized.pdf`                        |
| Protect PDF        | `/protect`        | `{name}_protected.pdf`                        |
| HTML to PDF        | `/html-to-pdf`    | `output.pdf`                                  |

---

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

---

Getting Started

```bash
npm install       # install dependencies
npm run dev       # start dev server at localhost:5173
npm run build     # production build (tsc + vite + prerender)
npm run typecheck # type-check without emitting
npm test          # run all tests (single pass, no watch)
```

---

## Project Structure

```
aurora-pdf/
├── src/
│   ├── app/              # Route-level pages — one folder per tool
│   │   └── compress/
│   │       ├── CompressPdfPage.tsx
│   │       └── hooks/useCompressPdf.ts
 ├── components/       # Shared UI — FileDropZone, ProgressPanel, NavBar, …
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

Each tool follows the same pattern: a page component at `src/app/{tool}/` with a co-located `hooks/use{Tool}.ts` that owns all processing logic. The page component is UI only.

---

## Privacy Model

Storage`, `IndexedDB`, or any server.

The central cleanup function is `useAuroraStore.clearWorkbox()` — the "digital shredder". It revokes the output Blob URL and resets all in-memory file state. It runs automatically:

- before every new file load (`setNewFile`)
- within 3 seconds of a download completing
- on any engine error (`failSession`)
- on navigation away from a tool page
- on `beforeunload`

The only value persisted to `localStorage` is the theme preference under the key `aurora-pdf-theme`.

erify: open DevTools → Network → process any file. Zero outbound requests to external URLs.

---

zy-1/aurora-pdf/issues).

---

## License

MIT © [AuroraPDF](https://github.com/stareezy-1/aurora-pdf)
ocessing — process multiple files in one session

- [ ] Drag-and-drop page reorder in the Organize tool
- [ ] Mobile-optimized file picker

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes — follow the existing tool pattern (`src/app/{tool}/`)
4. Add or update property tests in `__tests__/properties/`
5. Run `npm test` and `npm run typecheck` before opening a PR

For bug reports and feature requests, open an [issue](https://github.com/staree--

## PWA

AuroraPDF is installable as a Progressive Web App. After installation:

- Works fully offline (service worker caches all assets via Workbox)
- Launches from home screen / taskbar without a browser tab
- Processes files offline — no network dependency for any tool

---

## Roadmap

- [ ] Merge PDF — combine multiple files into one
- [ ] Rotate pages — per-page rotation controls
- [ ] Redact PDF — black-box sensitive content permanently
- [ ] PDF form fill — fill and flatten PDF forms
- [ ] Batch pr| OCR bounding box coordinate math |
      | `highlight-match.property.test.ts` | Search highlight matching |
      | `command-palette-filter.property.test.ts` | Command palette fuzzy filtering |

---

## Security

See [SECURITY.md](./SECURITY.md) for the full third-party library audit, including pinned versions and verified network behavior for each processing dependency.

All processing libraries are pinned to exact versions. No library in the processing pipeline makes outbound network requests with user file data.

| -ile                                    | What it covers                           |
| --------------------------------------- | ---------------------------------------- |
| `file-validator.property.test.ts`       | File type and size validation edge cases |
| `filename-utils.property.test.ts`       | Output filename generation for all tools |
| `compression-estimate.property.test.ts` | Compression ratio estimation bounds      |
| `range-parser.property.test.ts`         | Page range parsing (split tool)          |
| `format-utils.property.test.ts`         | File size formatting                     |
| `password-strength.property.test.ts`    | Password strength scoring                |

| `ocr-coordinate-transform.property.test.ts` all interactive controls

- ARIA labels on icon-only buttons and file drop zones
- Focus management — overlays trap focus and restore it on close
- `prefers-reduced-motion` respected via animation token values
- Screen reader announcements on processing status changes

---

## Testing

Tests use [Vitest](https://vitest.dev/) with [fast-check](https://fast-check.dev/) for property-based coverage:

```bash
npm test   # single pass — no watch mode
```

Property tests live in `__tests__/properties/` and cover:

| Test f---|
| `aurora.deepSpace` | `#050505` | Primary background |
| `aurora.auroraGreen` | `#00ff88` | Primary accent, CTAs, progress bar |
| `aurora.starWhite` | `#ffffff` | Primary text |
| `aurora.nebulaPurple` | `#7c3aed` | Secondary accent |
| `aurora.cosmicGray` | `#1a1a2e` | Card / surface background |

Default theme is dark. Users can toggle via the `ThemeToggle` component in the NavBar. The preference is persisted to `localStorage` under `aurora-pdf-theme`.

---

## Accessibility

- Keyboard navigation on theme // 'light' | 'dark' (default: 'dark')
  toolConfig // per-tool configuration

````

React 19 patterns used throughout:

- `useTransition` wraps all engine calls to keep the UI responsive during heavy processing
- `useOptimistic` drives the progress bar so it never appears frozen
- `<Suspense>` gates tool page loading with skeleton placeholders

---

## Aurora Theme

The app uses a custom design token set registered via `createUi()` from `@stareezy-ui/tokens`:

| Token | Value | Usage |
|---|---|## State Management

A single Zustand store — `useAuroraStore` — manages all global state:

```ts
activeFile      // File | null
resultBlobUrl   // string | null
status          // 'idle' | 'processing' | 'success' | 'error'
progress        // 0–100
progressLabel   // human-readable progress string
sessionId       // uuid v4, reset on each new file
errorMessage    // string | null
outputFilename  // string | null

---

## Why AuroraPDF?

Most online PDF tools upload your files to a server. AuroraPDF doesn't. There is no backend. There is no server. Every conversion, compression, OCR pass, and signature happens in your browser's memory using WebAssembly and the Web APIs — and is gone the moment you close the tab.

This is not a marketing claim. It is a verifiable architectural constraint. Open DevTools → Network while processing any file. You will see zero outbound requests to external URLs.

---

## Tools

| Tool | Route | Output |
|---|---|---|
| Compress PDF | `/compress` | `{name}_compressed.pdf` |
| OCR: Images to PDF | `/ocr` | `ocr-output.pdf` |
| Searchable PDF | `/searchable-pdf` | `{name}_searchable.pdf` |
| PDF to JPG | `/pdf-to-jpg` | `{name}_pages.zip` / `{name}_page1.jpg` |
| PDF to Word | `/pdf-to-word` | `{name}.docx` |
| Word to PDF | `/word-to-pdf` | `{name}.pdf` |
| PDF to Excel | `/pdf-to-excel` | `{name}.xlsx` |
| Excel to PDF | `/excel-to-pdf` | `{name}.pdf` |
| Edit PDF | `/edit` | `{name}_edited.pdf` |
| Sign PDF | `/sign` | `{name}_signed.pdf` |
| Add Watermark | `/watermark` | `{name}_watermarked.pdf` |
| Split PDF | `/split` | `{name}_split.pdf` / `{name}_split_parts.zip` |
| Organize PDF | `/organize` | `{name}_organized.pdf` |
| Protect PDF | `/protect` | `{name}_protected.pdf` |
| HTML to PDF | `/html-to-pdf` | `output.pdf` |

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19.2.0 + Vite 6 |
| Language | TypeScript 5.7, strict mode |
| Routing | React Router v7 (lazy-loaded routes) |
| State | Zustand 5 (`useAuroraStore`) |
| PDF manipulation | pdf-lib 1.17.1 |
| PDF rendering / parsing | pdfjs-dist 4.4.168 |
| OCR | Tesseract.js 5.1.1 |
| Word conversion | Mammoth 1.8.0 + docx 8.5.0 |
| Spreadsheet conversion | SheetJS (xlsx 0.18.5) |
| ZIP packaging | JSZip 3.10.1 |
| Design system | @stareezy-ui/tokens + components |
| Testing | Vitest 3 + fast-check (property-based) |
| PWA | vite-plugin-pwa + Workbox |

---

## Getting Started

```bash
npm install       # install dependencies
npm run dev       # start dev server at localhost:5173
npm run build     # production build (tsc + vite + prerender)
npm run typecheck # type-check without emitting
npm test          # run all tests (single pass, no watch)
````

---

## Project Structure

```
aurora-pdf/
├── src/
│   ├── app/              # Route-level pages — one folder per tool
│   │   └── compress/
│   │       ├── CompressPdfPage.tsx
│   │       └── hooks/useCompressPdf.ts
│   ├── components/       # Shared UI — FileDropZone, ProgressPanel, NavBar, …
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

Each tool follows the same pattern: a page component at `src/app/{tool}/` with a co-located `hooks/use{Tool}.ts` that owns all processing logic. The page component is UI only.

---

## Privacy Model

All processing happens in browser memory (RAM). Files are held as `File`, `Blob`, or `ArrayBuffer` objects — never written to `localStorage`, `sessionStorage`, `IndexedDB`, or any server.

The central cleanup function is `useAuroraStore.clearWorkbox()` — the "digital shredder". It revokes the output Blob URL and resets all in-memory file state. It runs automatically:

- before every new file load (`setNewFile`)
- within 3 seconds of a download completing
- on any engine error (`failSession`)
- on navigation away from a tool page
- on `beforeunload`

The only value persisted to `localStorage` is the theme preference under the key `aurora-pdf-theme`.

To verify: open DevTools → Network → process any file. Zero outbound requests to external URLs.

---

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

- `useTransition` wraps all engine calls to keep the UI responsive during heavy processing
- `useOptimistic` drives the progress bar so it never appears frozen
- `<Suspense>` gates tool page loading with skeleton placeholders

---

## Aurora Theme

The app uses a custom design token set registered via `createUi()` from `@stareezy-ui/tokens`:

| Token                 | Value     | Usage                              |
| --------------------- | --------- | ---------------------------------- |
| `aurora.deepSpace`    | `#050505` | Primary background                 |
| `aurora.auroraGreen`  | `#00ff88` | Primary accent, CTAs, progress bar |
| `aurora.starWhite`    | `#ffffff` | Primary text                       |
| `aurora.nebulaPurple` | `#7c3aed` | Secondary accent                   |
| `aurora.cosmicGray`   | `#1a1a2e` | Card / surface background          |

Default theme is dark. Users can toggle via the `ThemeToggle` component in the NavBar. The preference is persisted to `localStorage` under `aurora-pdf-theme`.

---

## Accessibility

- Keyboard navigation on all interactive controls
- ARIA labels on icon-only buttons and file drop zones
- Focus management — overlays trap focus and restore it on close
- `prefers-reduced-motion` respected via animation token values
- Screen reader announcements on processing status changes

---

## Testing

Tests use [Vitest](https://vitest.dev/) with [fast-check](https://fast-check.dev/) for property-based coverage:

```bash
npm test   # single pass — no watch mode
```

Property tests live in `__tests__/properties/` and cover:

| Test file                                   | What it covers                           |
| ------------------------------------------- | ---------------------------------------- |
| `file-validator.property.test.ts`           | File type and size validation edge cases |
| `filename-utils.property.test.ts`           | Output filename generation for all tools |
| `compression-estimate.property.test.ts`     | Compression ratio estimation bounds      |
| `range-parser.property.test.ts`             | Page range parsing (split tool)          |
| `format-utils.property.test.ts`             | File size formatting                     |
| `password-strength.property.test.ts`        | Password strength scoring                |
| `ocr-coordinate-transform.property.test.ts` | OCR bounding box coordinate math         |
| `highlight-match.property.test.ts`          | Search highlight matching                |
| `command-palette-filter.property.test.ts`   | Command palette fuzzy filtering          |

---

## Security

See [SECURITY.md](./SECURITY.md) for the full third-party library audit, including pinned versions and verified network behavior for each processing dependency.

All processing libraries are pinned to exact versions. No library in the processing pipeline makes outbound network requests with user file data.

---

## PWA

AuroraPDF is installable as a Progressive Web App:

- Works fully offline — service worker caches all assets via Workbox
- Launches from home screen / taskbar without a browser tab
- Processes files offline — no network dependency for any tool

---

## Roadmap

- [ ] Merge PDF — combine multiple files into one
- [ ] Rotate pages — per-page rotation controls
- [ ] Redact PDF — permanently black-box sensitive content
- [ ] PDF form fill — fill and flatten PDF forms
- [ ] Batch processing — process multiple files in one session
- [ ] Drag-and-drop page reorder in the Organize tool
- [ ] Mobile-optimized file picker

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Follow the existing tool pattern (`src/app/{tool}/` + co-located hook)
4. Add or update property tests in `__tests__/properties/`
5. Run `npm test` and `npm run typecheck` before opening a PR

For bug reports and feature requests, open an [issue](https://github.com/stareezy-1/aurora-pdf/issues).

---

## License

MIT © [AuroraPDF](https://github.com/stareezy-1/aurora-pdf)
