import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { PageRangeChips } from "@/components/PageRangeChips/PageRangeChips";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { parseRange } from "@/lib/range-parser";
import { useSplitPdf } from "./hooks/useSplitPdf";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export default function SplitPdfPage() {
  usePageTitle("Split PDF");
  const vm = useSplitPdf();

  const selectedCount =
    vm.rangeInput.trim() && !vm.rangeError
      ? parseRange(vm.rangeInput, vm.pageCount).length
      : 0;

  const splitLabel =
    selectedCount > 0 ? `Split PDF — ${selectedCount} pages` : "Split PDF";

  return (
    <ToolLayout toolName="Split PDF">
      <div className="tool-header">
        <h1>✂️ Split PDF</h1>
        <p>Extract specific pages from a PDF into a new, smaller file.</p>
      </div>

      <style>{`
        .split-range-row { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 600px) {
          .split-range-row { flex-direction: column; }
          .split-range-row .input-field { max-width: 100% !important; }
        }
      `}</style>

      {!vm.pdfFile && vm.status === "idle" && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to split"
          tool="split"
        />
      )}

      {vm.pdfFile && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.pdfFile.name}</div>
              <div className="file-size">
                {vm.pageCount} page{vm.pageCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="range-input">
              Page range (e.g. 1-3, 5, 7-9)
            </label>
            <div className="split-range-row">
              <input
                id="range-input"
                className="input-field"
                value={vm.rangeInput}
                onChange={(e) => vm.handleRangeChange(e.target.value)}
                placeholder="1-3, 5, 7-9"
                aria-label="Page range"
                style={{
                  maxWidth: 200,
                  borderColor: vm.rangeError ? "var(--red)" : undefined,
                }}
              />
              <input
                className="input-field"
                value={vm.newRangeName}
                onChange={(e) => vm.setNewRangeName(e.target.value)}
                placeholder="Range name (optional)"
                aria-label="Range name"
                style={{ maxWidth: 200 }}
              />
              <button
                className="btn btn-secondary"
                onClick={vm.addNamedRange}
                disabled={!vm.rangeInput.trim() || !!vm.rangeError}
                aria-label="Add named range"
              >
                + Add Range
              </button>
            </div>
            <PageRangeChips rangeStr={vm.rangeInput} pageCount={vm.pageCount} />
            {vm.rangeError && (
              <p
                style={{ color: "var(--red)", fontSize: 12, marginTop: 4 }}
                role="alert"
              >
                {vm.rangeError}
              </p>
            )}
          </div>

          {vm.namedRanges.length > 0 && (
            <div className="card-sm">
              <div className="label" style={{ marginBottom: 8 }}>
                Named ranges ({vm.namedRanges.length})
              </div>
              {vm.namedRanges.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                    <strong>{r.name}</strong>: {r.range}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      vm.setNamedRanges((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    aria-label={`Remove range ${r.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => vm.pdfFile && vm.processor.run(vm.pdfFile)}
              disabled={!vm.canSplit}
              aria-label="Split PDF"
            >
              {splitLabel}
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
          onDownload={vm.clearWorkbox}
          onReset={vm.handleReset}
          tool="split"
        />
      )}
    </ToolLayout>
  );
}
