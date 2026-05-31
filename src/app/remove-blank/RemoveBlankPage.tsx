import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useRemoveBlank } from "./hooks/useRemoveBlank";

export default function RemoveBlankPage() {
  usePageTitle("Remove Blank Pages");
  const vm = useRemoveBlank();

  return (
    <ToolLayout toolName="Remove Blank Pages">
      <style>{`
        .blank-thumb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
        }
      `}</style>

      <div className="tool-header">
        <h1>🗑️ Remove Blank Pages</h1>
        <p>Detect and remove blank pages from your PDF automatically.</p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to remove blank pages"
          tool="remove-blank"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">{vm.pageCount} pages</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginLeft: "auto" }}
            >
              Change file
            </button>
          </div>

          {/* Threshold slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="label">
              Blank Detection Threshold: {Math.round(vm.threshold * 100)}% white
            </label>
            <input
              type="range"
              min={0.8}
              max={1.0}
              step={0.01}
              value={vm.threshold}
              onChange={(e) => vm.setThreshold(parseFloat(e.target.value))}
              style={{ maxWidth: 320 }}
              aria-label="Blank page detection threshold"
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Higher = stricter (only nearly-pure-white pages detected)
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={vm.handleDetect}
            disabled={vm.isDetecting || !vm.bytes}
            aria-label="Detect blank pages"
          >
            {vm.isDetecting ? "⏳ Detecting…" : "🔍 Detect Blank Pages"}
          </button>

          {vm.detectError && (
            <p style={{ fontSize: 12, color: "var(--red, #ef4444)" }}>
              ⚠ {vm.detectError}
            </p>
          )}

          {vm.detectedPages !== null && (
            <>
              {vm.detectedPages.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 14,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  ✓ No blank pages detected at this threshold.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text)" }}>
                      {vm.detectedPages.length} blank page
                      {vm.detectedPages.length !== 1 ? "s" : ""} detected.
                      Uncheck any you want to keep.
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {vm.selectedForRemoval.size} selected for removal
                    </span>
                  </div>

                  <div
                    className="blank-thumb-grid"
                    role="list"
                    aria-label="Detected blank pages"
                  >
                    {vm.detectedPages.map((pageIdx) => (
                      <div
                        key={pageIdx}
                        role="listitem"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          padding: 8,
                          borderRadius: "var(--radius-md)",
                          border: vm.selectedForRemoval.has(pageIdx)
                            ? "1.5px solid var(--red, #ef4444)"
                            : "1px solid var(--border)",
                          background: vm.selectedForRemoval.has(pageIdx)
                            ? "rgba(239,68,68,0.06)"
                            : "var(--surface-2)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "0.707",
                            overflow: "hidden",
                            borderRadius: "var(--radius-sm)",
                            background: "#fff",
                          }}
                        >
                          {vm.allPreviews[pageIdx] ? (
                            <img
                              src={vm.allPreviews[pageIdx]}
                              alt={`Page ${pageIdx + 1}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "#f8f8f8",
                              }}
                            />
                          )}
                        </div>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={vm.selectedForRemoval.has(pageIdx)}
                            onChange={() => vm.togglePage(pageIdx)}
                            aria-label={`Remove page ${pageIdx + 1}`}
                          />
                          Page {pageIdx + 1}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={vm.handleRemove}
                      disabled={vm.selectedForRemoval.size === 0}
                      aria-label="Remove selected blank pages"
                    >
                      🗑️ Remove {vm.selectedForRemoval.size} Page
                      {vm.selectedForRemoval.size !== 1 ? "s" : ""}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={vm.handleReset}
                    >
                      Change file
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <ProgressPanel
        status={vm.status}
        progress={vm.progress}
        label={vm.progressLabel}
        errorMessage={vm.errorMessage ?? undefined}
        onRetry={vm.handleReset}
      />

      {vm.status === "success" && (
        <PrivacyShield
          variant="card"
          status={vm.status}
          outputFilename={vm.outputFilename ?? undefined}
          blobUrl={vm.resultBlobUrl}
          onDownload={() => useAuroraStore.getState().clearWorkbox()}
          onReset={vm.handleReset}
          tool="remove-blank"
        />
      )}
    </ToolLayout>
  );
}
