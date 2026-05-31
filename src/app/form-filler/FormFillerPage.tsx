/**
 * FormFillerPage — Fill AcroForm fields in a PDF.
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5
 */

import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useFormFiller } from "./hooks/useFormFiller";

export default function FormFillerPage() {
  usePageTitle("PDF Form Filler");
  const vm = useFormFiller();

  return (
    <ToolLayout toolName="PDF Form Filler">
      <div className="tool-header">
        <h1>📝 PDF Form Filler</h1>
        <p>
          Fill interactive AcroForm fields in a PDF and download the completed
          form.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF with form fields"
          tool="form-filler"
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

          {vm.isXfa && (
            <div
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--text-2)",
              }}
            >
              ⚠️ This PDF uses XFA forms. Basic AcroForm fields will be filled;
              XFA-only fields may not be editable.
            </div>
          )}

          {vm.fields.length === 0 && (
            <div
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--text-2)",
              }}
            >
              ℹ️ No fillable form fields were detected in this PDF.
            </div>
          )}

          {vm.fields.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: 560,
              }}
            >
              <div
                style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}
              >
                Form Fields ({vm.fields.length})
              </div>
              {vm.fields.map((field) => (
                <div
                  key={field.name}
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    htmlFor={`field-${field.name}`}
                    className="label"
                    style={{ fontSize: 13 }}
                  >
                    {field.name}
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontWeight: 400,
                      }}
                    >
                      ({field.type})
                    </span>
                  </label>

                  {field.type === "text" && (
                    <input
                      id={`field-${field.name}`}
                      className="input"
                      type="text"
                      value={vm.fieldValues[field.name] ?? ""}
                      onChange={(e) =>
                        vm.setFieldValue(field.name, e.target.value)
                      }
                      placeholder={`Enter ${field.name}…`}
                    />
                  )}

                  {field.type === "checkbox" && (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        id={`field-${field.name}`}
                        type="checkbox"
                        checked={vm.fieldChecked[field.name] ?? false}
                        onChange={(e) =>
                          vm.setFieldCheck(field.name, e.target.checked)
                        }
                      />
                      <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                        {vm.fieldChecked[field.name] ? "Checked" : "Unchecked"}
                      </span>
                    </label>
                  )}

                  {(field.type === "dropdown" || field.type === "radio") && (
                    <select
                      id={`field-${field.name}`}
                      className="input"
                      value={vm.fieldValues[field.name] ?? ""}
                      onChange={(e) =>
                        vm.setFieldValue(field.name, e.target.value)
                      }
                    >
                      <option value="">— Select —</option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "unknown" && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Unsupported field type
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending || vm.fields.length === 0}
              aria-label="Fill and download PDF"
            >
              📝 Fill &amp; Download
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
          tool="form-filler"
        />
      )}
    </ToolLayout>
  );
}
