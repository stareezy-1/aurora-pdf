/**
 * FormBuilderPage — Create interactive PDF forms.
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
 */

import { useRef } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useFormBuilder, FieldType } from "./hooks/useFormBuilder";

const FIELD_PALETTE: Array<{ type: FieldType; icon: string; label: string }> = [
  { type: "text", icon: "T", label: "Text" },
  { type: "checkbox", icon: "☑", label: "Checkbox" },
  { type: "radio", icon: "◉", label: "Radio" },
  { type: "dropdown", icon: "▾", label: "Dropdown" },
  { type: "date", icon: "📅", label: "Date" },
  { type: "signature", icon: "✍", label: "Signature" },
];

export default function FormBuilderPage() {
  usePageTitle("Create PDF Form");
  const vm = useFormBuilder();
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!vm.file) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Only add field if no field type is being dragged — use a simple click-to-add
    // with the last selected palette type
    vm.addField("text", x - 90, y - 14);
  };

  const handlePaletteClick = (type: FieldType) => {
    if (!vm.file) return;
    // Add field at center of canvas
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = rect ? rect.width / 2 - 90 : 100;
    const y = rect ? rect.height / 2 - 14 : 100;
    vm.addField(type, x, y);
  };

  return (
    <ToolLayout toolName="Create PDF Form">
      <div className="tool-header">
        <h1>📋 Create PDF Form</h1>
        <p>
          Add interactive form fields to a PDF. Click a field type to place it
          on the page.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to add form fields"
          tool="form-builder"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Left: Field palette + config */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              minWidth: 200,
              maxWidth: 240,
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

            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 8,
                  color: "var(--text)",
                }}
              >
                Field Palette
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                {FIELD_PALETTE.map(({ type, icon, label }) => (
                  <button
                    key={type}
                    className="btn btn-secondary btn-sm"
                    onClick={() => handlePaletteClick(type)}
                    title={`Add ${label} field`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      padding: "8px 4px",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ fontSize: 11 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Field config panel */}
            {vm.selectedField && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--text)",
                  }}
                >
                  Field Config
                </div>
                <label className="label" style={{ fontSize: 12 }}>
                  Name
                </label>
                <input
                  className="input"
                  style={{ fontSize: 12 }}
                  value={vm.selectedField.name}
                  onChange={(e) =>
                    vm.updateField(vm.selectedField!.id, {
                      name: e.target.value,
                    })
                  }
                />
                <label className="label" style={{ fontSize: 12 }}>
                  Label
                </label>
                <input
                  className="input"
                  style={{ fontSize: 12 }}
                  value={vm.selectedField.label}
                  onChange={(e) =>
                    vm.updateField(vm.selectedField!.id, {
                      label: e.target.value,
                    })
                  }
                />
                {(vm.selectedField.type === "dropdown" ||
                  vm.selectedField.type === "radio") && (
                  <>
                    <label className="label" style={{ fontSize: 12 }}>
                      Options (one per line)
                    </label>
                    <textarea
                      className="input"
                      style={{
                        fontSize: 12,
                        minHeight: 60,
                        resize: "vertical",
                      }}
                      value={(vm.selectedField.options ?? []).join("\n")}
                      onChange={(e) =>
                        vm.updateField(vm.selectedField!.id, {
                          options: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                    />
                  </>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: "var(--red, #ef4444)", fontSize: 12 }}
                  onClick={() => vm.removeField(vm.selectedField!.id)}
                >
                  🗑 Remove Field
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
                disabled={vm.isPending || vm.fields.length === 0}
              >
                📋 Export Form PDF
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleReset}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right: Page preview canvas */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              Click a field type above to place it on the page. Click a placed
              field to select it.
            </div>
            <div
              ref={canvasRef}
              style={{
                position: "relative",
                display: "inline-block",
                cursor: "crosshair",
              }}
              onClick={handleCanvasClick}
            >
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
              {/* Render placed fields as overlays */}
              {vm.fields
                .filter((f) => f.pageIndex === vm.currentPage)
                .map((field) => (
                  <div
                    key={field.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      vm.setSelectedFieldId(field.id);
                    }}
                    style={{
                      position: "absolute",
                      left: field.x,
                      top: field.y,
                      width: field.width,
                      height: field.height,
                      border: `2px solid ${
                        vm.selectedFieldId === field.id
                          ? "var(--green, #00ff88)"
                          : "rgba(0,150,255,0.7)"
                      }`,
                      background: "rgba(0,150,255,0.08)",
                      borderRadius: 3,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "rgba(0,150,255,0.9)",
                      userSelect: "none",
                    }}
                  >
                    {field.label}
                  </div>
                ))}
            </div>
            {vm.fields.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {vm.fields.length} field{vm.fields.length !== 1 ? "s" : ""}{" "}
                placed
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
          tool="form-builder"
        />
      )}
    </ToolLayout>
  );
}
