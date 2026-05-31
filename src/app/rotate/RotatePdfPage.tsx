import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useRotatePdf, type RotationDegrees } from "./hooks/useRotatePdf";

export default function RotatePdfPage() {
  usePageTitle("Rotate PDF");
  const vm = useRotatePdf();

  return (
    <ToolLayout toolName="Rotate PDF">
      <style>{`
        .rotate-thumb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 14px;
        }
        @media (max-width: 600px) {
          .rotate-thumb-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
        }
      `}</style>

      <div className="tool-header">
        <h1>🔄 Rotate PDF</h1>
        <p>Rotate individual pages or all pages at once.</p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to rotate"
          tool="rotate"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">
                {vm.pageCount} page{vm.pageCount !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginLeft: "auto" }}
            >
              Change file
            </button>
          </div>

          {/* Rotate all controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}
            >
              Rotate all pages:
            </span>
            {([90, 180, 270] as RotationDegrees[]).map((deg) => (
              <button
                key={deg}
                className="btn btn-secondary btn-sm"
                onClick={() => vm.rotateAll(deg)}
                aria-label={`Rotate all pages ${deg} degrees`}
              >
                ↻ {deg}°
              </button>
            ))}
            {vm.hasChanges && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.resetRotations}
                style={{ color: "var(--text-muted)" }}
              >
                Reset all
              </button>
            )}
          </div>

          {/* Per-page thumbnail grid */}
          {vm.allPreviews.length > 0 ? (
            <div
              className="rotate-thumb-grid"
              role="list"
              aria-label="PDF pages"
            >
              {vm.allPreviews.map((thumb, idx) => {
                const rotation = vm.rotations[idx] ?? 0;
                return (
                  <div
                    key={idx}
                    role="listitem"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: 8,
                      borderRadius: "var(--radius-md)",
                      border:
                        rotation !== 0
                          ? "1.5px solid var(--green)"
                          : "1px solid var(--border)",
                      background:
                        rotation !== 0
                          ? "rgba(0,255,136,0.06)"
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
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={thumb}
                        alt={`Page ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          transform: `rotate(${rotation}deg)`,
                          transition: "transform 0.2s ease",
                        }}
                        draggable={false}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      Page {idx + 1}
                      {rotation !== 0 ? ` (${rotation}°)` : ""}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {([90, 180, 270] as RotationDegrees[]).map((deg) => (
                        <button
                          key={deg}
                          className="btn btn-secondary btn-sm"
                          onClick={() => vm.rotatePage(idx, deg)}
                          aria-label={`Rotate page ${
                            idx + 1
                          } by ${deg} degrees`}
                          style={{ fontSize: 11, padding: "2px 6px" }}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "32px 0",
              }}
            >
              Loading thumbnails…
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={!vm.hasChanges}
              aria-label="Apply rotations and save"
            >
              🔄 Apply Rotations
            </button>
            <button className="btn btn-secondary" onClick={vm.handleReset}>
              Change file
            </button>
          </div>
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
          tool="rotate"
        />
      )}
    </ToolLayout>
  );
}
