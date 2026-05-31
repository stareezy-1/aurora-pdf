/**
 * RemoveAnnotationsPage — Remove annotations from a PDF.
 * Requirements: 34.1, 34.2, 34.3, 34.4
 */

import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useRemoveAnnotations } from "./hooks/useRemoveAnnotations";

export default function RemoveAnnotationsPage() {
  usePageTitle("Remove Annotations");
  const vm = useRemoveAnnotations();

  const allChecked = vm.ANNOTATION_TYPES.every((t) => vm.enabledTypes.has(t));
  const someChecked = vm.ANNOTATION_TYPES.some((t) => vm.enabledTypes.has(t));

  return (
    <ToolLayout toolName="Remove Annotations">
      <div className="tool-header">
        <h1>🗑️ Remove Annotations</h1>
        <p>
          Remove highlights, comments, stamps, and other annotations from a PDF.
          Filter by annotation type.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to remove annotations"
          tool="remove-annotations"
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

          {/* Annotation summary */}
          {vm.totalAnnotations === 0 ? (
            <div
              style={{
                background: "rgba(0,255,136,0.06)",
                border: "1px solid rgba(0,255,136,0.2)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--text-2)",
              }}
            >
              ✅ No annotations detected in this PDF.
            </div>
          ) : (
            <div
              style={{
                background: "var(--surface-2)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                fontSize: 13,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "var(--text)",
                }}
              >
                Found {vm.totalAnnotations} annotation
                {vm.totalAnnotations !== 1 ? "s" : ""} across{" "}
                {vm.pageInfo.length} page{vm.pageInfo.length !== 1 ? "s" : ""}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {vm.pageInfo.map((p) => (
                  <div
                    key={p.pageIndex}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--text-2)",
                    }}
                  >
                    <span>Page {p.pageIndex + 1}</span>
                    <span>
                      {p.total} annotation{p.total !== 1 ? "s" : ""}
                      {Object.keys(p.byType).length > 0 && (
                        <span
                          style={{ color: "var(--text-muted)", marginLeft: 6 }}
                        >
                          (
                          {Object.entries(p.byType)
                            .map(([t, n]) => `${n} ${t}`)
                            .join(", ")}
                          )
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type filter */}
          <div style={{ maxWidth: 480 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 10,
                color: "var(--text)",
              }}
            >
              Annotation Types to Remove
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = !allChecked && someChecked;
                }}
                onChange={(e) => vm.toggleAll(e.target.checked)}
              />
              Select All
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 6,
              }}
            >
              {vm.ANNOTATION_TYPES.map((type) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    color: "var(--text-2)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={vm.enabledTypes.has(type)}
                    onChange={() => vm.toggleType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={
                vm.isPending || vm.totalAnnotations === 0 || !someChecked
              }
              aria-label="Remove annotations"
            >
              🗑️ Remove Annotations
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
          tool="remove-annotations"
        />
      )}
    </ToolLayout>
  );
}
