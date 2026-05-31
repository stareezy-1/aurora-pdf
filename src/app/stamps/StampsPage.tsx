/**
 * StampsPage — Add stamps to a PDF.
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5
 */

import { useRef } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useStamps } from "./hooks/useStamps";

export default function StampsPage() {
  usePageTitle("Add Stamps");
  const vm = useStamps();
  const customInputRef = useRef<HTMLInputElement>(null);

  return (
    <ToolLayout toolName="Add Stamps">
      <div className="tool-header">
        <h1>🔖 Add Stamps</h1>
        <p>
          Place built-in or custom stamps on PDF pages. Adjust size, rotation,
          and opacity.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to add stamps"
          tool="stamps"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Sidebar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              minWidth: 220,
              maxWidth: 260,
            }}
          >
            <div
              className="file-info-strip"
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
              }}
            >
              <div className="file-name" style={{ fontSize: 13 }}>
                {vm.file.name}
              </div>
              <div className="file-size">{vm.pageCount} pages</div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleReset}
                style={{ marginTop: 4 }}
              >
                Change file
              </button>
            </div>

            {/* Built-in stamps */}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 8,
                  color: "var(--text)",
                }}
              >
                Built-in Stamps
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vm.BUILT_IN_STAMPS.map((stamp) => (
                  <button
                    key={stamp.id}
                    className="btn btn-secondary btn-sm"
                    onClick={() => vm.addBuiltInStamp(stamp)}
                    style={{
                      border: `1px solid ${stamp.color}`,
                      color: stamp.color,
                      background: stamp.bg,
                      fontWeight: 700,
                      letterSpacing: 1,
                      fontSize: 12,
                    }}
                  >
                    {stamp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom stamp upload */}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 6,
                  color: "var(--text)",
                }}
              >
                Custom Stamp
              </div>
              <input
                ref={customInputRef}
                type="file"
                accept="image/png,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) vm.addCustomStamp(file);
                  e.target.value = "";
                }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => customInputRef.current?.click()}
                style={{ width: "100%" }}
              >
                📁 Upload PNG / SVG
              </button>
            </div>

            {/* Selected stamp controls */}
            {vm.selectedPlacement && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--text)",
                  }}
                >
                  {vm.selectedPlacement.label}
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12 }}>
                    Opacity: {vm.selectedPlacement.opacity}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={vm.selectedPlacement.opacity}
                    onChange={(e) =>
                      vm.updatePlacement(vm.selectedPlacement!.id, {
                        opacity: Number(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12 }}>
                    Rotation: {vm.selectedPlacement.rotation}°
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={vm.selectedPlacement.rotation}
                    onChange={(e) =>
                      vm.updatePlacement(vm.selectedPlacement!.id, {
                        rotation: Number(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <label className="label" style={{ fontSize: 11 }}>
                      W
                    </label>
                    <input
                      type="number"
                      className="input"
                      style={{ fontSize: 12 }}
                      value={Math.round(vm.selectedPlacement.width)}
                      min={20}
                      max={600}
                      onChange={(e) =>
                        vm.updatePlacement(vm.selectedPlacement!.id, {
                          width: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="label" style={{ fontSize: 11 }}>
                      H
                    </label>
                    <input
                      type="number"
                      className="input"
                      style={{ fontSize: 12 }}
                      value={Math.round(vm.selectedPlacement.height)}
                      min={10}
                      max={400}
                      onChange={(e) =>
                        vm.updatePlacement(vm.selectedPlacement!.id, {
                          height: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: "var(--red, #ef4444)", fontSize: 12 }}
                  onClick={() => vm.removePlacement(vm.selectedPlacement!.id)}
                >
                  🗑 Remove Stamp
                </button>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: "auto",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={vm.handleApply}
                disabled={vm.isPending || vm.placements.length === 0}
              >
                🔖 Embed Stamps
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleReset}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Page preview */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              Click a stamp above to place it. Click a placed stamp to select
              and adjust it.
            </div>
            <div style={{ position: "relative", display: "inline-block" }}>
              {vm.preview && (
                <img
                  ref={vm.previewRef}
                  src={vm.preview}
                  alt="PDF page preview"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    border: "1px solid var(--border)",
                  }}
                />
              )}

              {/* Render placed stamps */}
              {vm.placements
                .filter((p) => p.pageIndex === vm.currentPage)
                .map((p) => (
                  <div
                    key={p.id}
                    onClick={() => vm.setSelectedId(p.id)}
                    style={{
                      position: "absolute",
                      left: p.x,
                      top: p.y,
                      width: p.width,
                      height: p.height,
                      opacity: p.opacity / 100,
                      transform: `rotate(${p.rotation}deg)`,
                      transformOrigin: "center center",
                      border: `2px solid ${
                        vm.selectedId === p.id
                          ? "var(--green, #00ff88)"
                          : "rgba(0,150,255,0.5)"
                      }`,
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={p.dataUrl}
                      alt={p.label}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                ))}
            </div>

            {vm.placements.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {vm.placements.length} stamp
                {vm.placements.length !== 1 ? "s" : ""} placed
              </div>
            )}
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
          tool="stamps"
        />
      )}
    </ToolLayout>
  );
}
