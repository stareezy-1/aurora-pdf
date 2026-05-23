import { useRef, useEffect } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { DownloadButton } from "@/components/DownloadButton/DownloadButton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useOcr } from "./hooks/useOcr";

const IMAGE_ACCEPT = [
  { mime: "image/jpeg", extension: ".jpg" },
  { mime: "image/jpeg", extension: ".jpeg" },
  { mime: "image/png", extension: ".png" },
  { mime: "image/tiff", extension: ".tiff" },
  { mime: "image/bmp", extension: ".bmp" },
  { mime: "image/webp", extension: ".webp" },
];

const LANG_FLAGS: Record<string, string> = {
  eng: "🇬🇧",
  fra: "🇫🇷",
  deu: "🇩🇪",
  spa: "🇪🇸",
  ita: "🇮🇹",
  por: "🇵🇹",
  rus: "🇷🇺",
  jpn: "🇯🇵",
  kor: "🇰🇷",
  chi_sim: "🇨🇳",
  chi_tra: "🇹🇼",
  ara: "🇸🇦",
  hin: "🇮🇳",
  nld: "🇳🇱",
  pol: "🇵🇱",
  tur: "🇹🇷",
  vie: "🇻🇳",
  ind: "🇮🇩",
};

function getLangFlag(code: string): string {
  return LANG_FLAGS[code] ?? "🌐";
}

function confidenceColor(score: number): string {
  if (score >= 80) return "var(--green, #00ff88)";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export default function OcrPage() {
  usePageTitle("OCR: Images to PDF");
  const vm = useOcr();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vm.langDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(e.target as Node)
      ) {
        vm.setLangDropdownOpen(false);
        const selected = vm.languages.find((l) => l.code === vm.language);
        vm.setLangSearch(
          selected ? `${getLangFlag(selected.code)} ${selected.label}` : "",
        );
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    vm.langDropdownOpen,
    vm.language,
    vm.languages,
    vm.setLangDropdownOpen,
    vm.setLangSearch,
  ]);

  const filteredLanguages = vm.languages.filter((l) =>
    l.label
      .toLowerCase()
      .includes(vm.langSearch.replace(/^\S+\s/, "").toLowerCase()),
  );

  const selectedLang = vm.languages.find((l) => l.code === vm.language);
  const displayValue = vm.langDropdownOpen
    ? vm.langSearch
    : selectedLang
      ? `${getLangFlag(selectedLang.code)} ${selectedLang.label}`
      : "";

  function handleSelectAll() {
    textAreaRef.current?.select();
  }

  function handleLangInputFocus() {
    vm.setLangSearch("");
    vm.setLangDropdownOpen(true);
  }

  function handleLangInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    vm.setLangSearch(e.target.value);
    vm.setLangDropdownOpen(true);
  }

  function handleLangSelect(code: string) {
    vm.setLanguage(code);
    vm.setLangDropdownOpen(false);
    const lang = vm.languages.find((l) => l.code === code);
    vm.setLangSearch(lang ? `${getLangFlag(lang.code)} ${lang.label}` : "");
  }

  return (
    <ToolLayout toolName="OCR: Images to PDF">
      <style>{`
        .ocr-previews { display: flex; flex-direction: column; gap: 12px; }
        @media (max-width: 768px) {
          .ocr-previews { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        }
        .lang-combobox { position: relative; }
        .lang-combobox-input {
          width: 100%; min-width: 220px; padding: 8px 12px;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: var(--radius-md, 6px); color: var(--text);
          font-size: 14px; outline: none; box-sizing: border-box;
        }
        .lang-combobox-input:focus {
          border-color: var(--green); outline: 2px solid var(--green); outline-offset: 2px;
        }
        .lang-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          min-width: 220px; max-height: 220px; overflow-y: auto;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: var(--radius-md, 6px); z-index: 100;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4); list-style: none; margin: 0; padding: 0;
        }
        .lang-option {
          padding: 8px 12px; font-size: 14px; color: var(--text);
          cursor: pointer; display: flex; align-items: center; gap: 8px;
        }
        .lang-option:hover, .lang-option[aria-selected="true"] {
          background: var(--surface-3); color: var(--green);
        }
      `}</style>

      <div className="tool-header">
        <h1>🔍 OCR: Images to PDF</h1>
        <p>
          Extract text from images and create a searchable PDF. Images are
          pre-processed for maximum accuracy.
        </p>
      </div>

      {vm.status === "idle" && (
        <>
          {vm.files.length === 0 ? (
            <FileDropZone
              accept={IMAGE_ACCEPT}
              multiple
              onFilesAccepted={vm.handleFilesAccepted}
              onError={(msg) => useAuroraStore.getState().failSession(msg)}
              aria-label="Drop image files for OCR"
              tool="ocr"
            />
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                {vm.imagePreviews.map((src, i) => (
                  <div key={i} className="preview-panel">
                    <div
                      className="preview-panel-header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{vm.files[i]?.name ?? `Image ${i + 1}`}</span>
                      <span
                        style={{ color: "var(--text-muted)", fontSize: 11 }}
                      >
                        {vm.files[i]
                          ? `${(vm.files[i].size / 1024).toFixed(0)} KB`
                          : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: 0,
                        background: "#111",
                        display: "flex",
                        justifyContent: "center",
                        minHeight: 120,
                      }}
                    >
                      <img
                        src={src}
                        alt={`Image ${i + 1}`}
                        style={{
                          width: "100%",
                          maxHeight: 600,
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "flex-end",
                  marginBottom: 20,
                }}
              >
                <div>
                  <label className="label" htmlFor="ocr-lang-input">
                    OCR Language
                  </label>
                  <div
                    className="lang-combobox"
                    ref={comboboxRef}
                    role="combobox"
                    aria-expanded={vm.langDropdownOpen}
                    aria-haspopup="listbox"
                    aria-owns="ocr-lang-listbox"
                  >
                    <input
                      id="ocr-lang-input"
                      className="lang-combobox-input"
                      type="text"
                      value={displayValue}
                      placeholder="Search language..."
                      aria-label="Select OCR language"
                      aria-autocomplete="list"
                      aria-controls="ocr-lang-listbox"
                      aria-activedescendant={
                        vm.langDropdownOpen
                          ? `ocr-lang-opt-${vm.language}`
                          : undefined
                      }
                      onFocus={handleLangInputFocus}
                      onChange={handleLangInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          vm.setLangDropdownOpen(false);
                          const sel = vm.languages.find(
                            (l) => l.code === vm.language,
                          );
                          vm.setLangSearch(
                            sel ? `${getLangFlag(sel.code)} ${sel.label}` : "",
                          );
                        }
                      }}
                      autoComplete="off"
                    />
                    {vm.langDropdownOpen && filteredLanguages.length > 0 && (
                      <ul
                        id="ocr-lang-listbox"
                        className="lang-dropdown"
                        role="listbox"
                        aria-label="Languages"
                      >
                        {filteredLanguages.map((l) => (
                          <li
                            key={l.code}
                            id={`ocr-lang-opt-${l.code}`}
                            className="lang-option"
                            role="option"
                            aria-selected={l.code === vm.language}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleLangSelect(l.code);
                            }}
                          >
                            <span aria-hidden="true">
                              {getLangFlag(l.code)}
                            </span>
                            {l.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={vm.handleRun}
                    aria-label="Run OCR"
                  >
                    🔍 Run OCR on {vm.files.length} image
                    {vm.files.length !== 1 ? "s" : ""}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={vm.handleReset}
                    aria-label="Clear images"
                  >
                    ✕ Clear
                  </button>
                </div>
              </div>

              <div className="alert alert-info" style={{ fontSize: 12 }}>
                Images are automatically upscaled and contrast-enhanced before
                OCR for better accuracy.
              </div>
            </>
          )}
        </>
      )}

      <ProgressPanel
        status={vm.status}
        progress={vm.progress}
        label={vm.progressLabel}
        errorMessage={vm.errorMessage ?? undefined}
        onRetry={vm.handleReset}
      />

      {vm.status === "success" && (
        <div
          className="fade-in"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 8,
          }}
        >
          {vm.blankPages.length > 0 && (
            <div className="alert alert-warning">
              No text detected in: {vm.blankPages.join(", ")}. Blank pages were
              inserted.
            </div>
          )}

          {vm.pdfPreviews.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  📄 Generated PDF Preview
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  ({vm.pdfPreviews.length} page
                  {vm.pdfPreviews.length !== 1 ? "s" : ""} shown)
                </span>
              </div>
              <div className="ocr-previews">
                {vm.pdfPreviews.map((src, i) => {
                  const score = vm.confidenceScores[i] ?? 0;
                  return (
                    <div key={i} className="preview-panel">
                      <div
                        className="preview-panel-header"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Page {i + 1}</span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: confidenceColor(score),
                          }}
                          aria-label={`Confidence score: ${score}%`}
                        >
                          Confidence: {score}%
                        </span>
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          display: "flex",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <img
                          src={src}
                          alt={`PDF page ${i + 1}`}
                          style={{ width: "100%", display: "block" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {vm.extractedText && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    📝 Extracted Text
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {vm.extractedText.length.toLocaleString()} characters
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleSelectAll}
                    aria-label="Select all text"
                  >
                    ⬜ Select All
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={vm.handleCopyText}
                    aria-label="Copy all text to clipboard"
                    style={{
                      background: vm.copied
                        ? "rgba(0,255,136,0.15)"
                        : "var(--surface-3)",
                      color: vm.copied ? "var(--green)" : "var(--text)",
                      border: `1px solid ${
                        vm.copied ? "var(--green)" : "var(--border)"
                      }`,
                      transition: "all 0.2s",
                    }}
                  >
                    {vm.copied ? "✓ Copied!" : "📋 Copy All"}
                  </button>
                </div>
              </div>
              <textarea
                ref={textAreaRef}
                readOnly
                value={vm.extractedText}
                aria-label="Extracted text content"
                style={{
                  width: "100%",
                  minHeight: 280,
                  maxHeight: 520,
                  padding: "16px",
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "none",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  cursor: "text",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                }}
                onClick={(e) => e.currentTarget.focus()}
              />
            </div>
          )}

          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--green)",
                marginBottom: 4,
              }}
            >
              Processed Locally — Zero Upload
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 20,
              }}
            >
              Your file never left your device.
            </p>
            {vm.resultBlobUrl && vm.outputFilename && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <DownloadButton
                  blobUrl={vm.resultBlobUrl}
                  filename={vm.outputFilename}
                  onDownloadComplete={vm.clearWorkbox}
                  tool="ocr"
                />
                <button
                  className="btn btn-secondary"
                  onClick={vm.handleReset}
                  aria-label="Process another file"
                >
                  ↩ Process Another
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
