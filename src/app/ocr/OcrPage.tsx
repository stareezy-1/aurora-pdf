import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
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

export default function OcrPage() {
  usePageTitle("OCR: Images to PDF");
  const vm = useOcr();

  return (
    <ToolLayout toolName="OCR: Images to PDF">
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
            />
          ) : (
            <>
              {/* Full-width image previews */}
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
                      <span>🖼️ {vm.files[i]?.name ?? `Image ${i + 1}`}</span>
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
                        alignItems: "center",
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

              {/* Controls */}
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
                  <label className="label" htmlFor="ocr-lang">
                    OCR Language
                  </label>
                  <select
                    id="ocr-lang"
                    className="select-field"
                    value={vm.language}
                    onChange={(e) => vm.setLanguage(e.target.value)}
                    aria-label="Select OCR language"
                    style={{ minWidth: 200 }}
                  >
                    {vm.languages.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
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
                💡 Images are automatically upscaled and contrast-enhanced
                before OCR for better text extraction accuracy.
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
        <>
          {vm.blankPages.length > 0 && (
            <div className="alert alert-warning" style={{ marginTop: 16 }}>
              ⚠ No text detected in: {vm.blankPages.join(", ")}. Blank pages
              were inserted.
            </div>
          )}
          <PrivacyShield
            variant="card"
            status={vm.status}
            outputFilename={vm.outputFilename ?? undefined}
            blobUrl={vm.resultBlobUrl}
            onDownload={vm.clearWorkbox}
            onReset={vm.handleReset}
          />
        </>
      )}
    </ToolLayout>
  );
}
