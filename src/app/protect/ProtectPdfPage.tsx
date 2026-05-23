import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useProtectPdf } from "./hooks/useProtectPdf";
import type { PasswordStrength } from "./hooks/useProtectPdf";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak: "#ff4444",
  medium: "#ffaa00",
  strong: "#00ff88",
};

const STRENGTH_WIDTH: Record<PasswordStrength, string> = {
  weak: "33%",
  medium: "66%",
  strong: "100%",
};

export default function ProtectPdfPage() {
  usePageTitle("Protect PDF");
  const vm = useProtectPdf();

  const canProtect =
    vm.pdfFile !== null &&
    vm.password.length > 0 &&
    vm.passwordsMatch &&
    vm.status === "idle" &&
    !vm.processor.isPending;

  return (
    <ToolLayout toolName="Protect PDF">
      <div className="tool-header">
        <h1>🔒 Protect PDF</h1>
        <p>
          Encrypt your PDF with a password. All processing happens locally —
          your file never leaves your device.
        </p>
      </div>

      {!vm.pdfFile && vm.status === "idle" && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to protect"
          tool="protect"
        />
      )}

      {vm.pdfFile && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* File info strip */}
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.pdfFile.name}</div>
              <div className="file-size">
                {(vm.pdfFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginLeft: "auto" }}
              aria-label="Change file"
            >
              Change file
            </button>
          </div>

          {/* Password input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="label" htmlFor="protect-password">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="protect-password"
                className="input-field"
                type={vm.showPassword ? "text" : "password"}
                value={vm.password}
                onChange={(e) => vm.setPassword(e.target.value)}
                placeholder="Enter a password…"
                aria-label="PDF password"
                aria-describedby="password-strength-desc"
                autoComplete="new-password"
                style={{
                  paddingRight: 44,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => vm.setShowPassword((v) => !v)}
                aria-label={vm.showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 16,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {vm.showPassword ? "🙈" : "👁"}
              </button>
            </div>

            {/* Password strength indicator */}
            {vm.password.length > 0 && (
              <div
                id="password-strength-desc"
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
                aria-live="polite"
              >
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "var(--border)",
                    overflow: "hidden",
                  }}
                  role="progressbar"
                  aria-valuenow={
                    vm.passwordStrength === "weak"
                      ? 33
                      : vm.passwordStrength === "medium"
                        ? 66
                        : 100
                  }
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Password strength"
                >
                  <div
                    style={{
                      height: "100%",
                      width: STRENGTH_WIDTH[vm.passwordStrength],
                      background: STRENGTH_COLOR[vm.passwordStrength],
                      borderRadius: 2,
                      transition: "width 0.3s, background 0.3s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: STRENGTH_COLOR[vm.passwordStrength],
                    fontWeight: 600,
                  }}
                >
                  {STRENGTH_LABEL[vm.passwordStrength]} password
                  {vm.passwordStrength === "weak" && (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontWeight: 400,
                        marginLeft: 6,
                      }}
                    >
                      — use 8+ characters
                    </span>
                  )}
                  {vm.passwordStrength === "medium" && (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontWeight: 400,
                        marginLeft: 6,
                      }}
                    >
                      — add numbers or symbols for strong
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Repeat password input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="label" htmlFor="protect-repeat-password">
              Repeat password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="protect-repeat-password"
                className="input-field"
                type={vm.showRepeatPassword ? "text" : "password"}
                value={vm.repeatPassword}
                onChange={(e) => vm.setRepeatPassword(e.target.value)}
                placeholder="Repeat the password…"
                aria-label="Repeat PDF password"
                aria-invalid={
                  vm.repeatPassword.length > 0 && !vm.passwordsMatch
                }
                aria-describedby={
                  vm.repeatPassword.length > 0 && !vm.passwordsMatch
                    ? "password-mismatch-error"
                    : undefined
                }
                autoComplete="new-password"
                style={{
                  paddingRight: 44,
                  width: "100%",
                  boxSizing: "border-box",
                  borderColor:
                    vm.repeatPassword.length > 0 && !vm.passwordsMatch
                      ? "var(--red, #ff4444)"
                      : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => vm.setShowRepeatPassword((v) => !v)}
                aria-label={
                  vm.showRepeatPassword
                    ? "Hide repeat password"
                    : "Show repeat password"
                }
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 16,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {vm.showRepeatPassword ? "🙈" : "👁"}
              </button>
            </div>

            {/* Mismatch error */}
            {vm.repeatPassword.length > 0 && !vm.passwordsMatch && (
              <p
                id="password-mismatch-error"
                style={{
                  color: "var(--red, #ff4444)",
                  fontSize: 12,
                  margin: 0,
                }}
                role="alert"
                aria-live="polite"
              >
                ⚠ Passwords do not match
              </p>
            )}

            {/* Match confirmation */}
            {vm.passwordsMatch && (
              <p
                style={{ color: "var(--green)", fontSize: 12, margin: 0 }}
                aria-live="polite"
              >
                ✓ Passwords match
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => vm.pdfFile && vm.processor.run(vm.pdfFile)}
              disabled={!canProtect}
              aria-label="Protect PDF with password"
              aria-busy={vm.processor.isPending}
            >
              🔒 Protect PDF
            </button>
            <button
              className="btn btn-secondary"
              onClick={vm.handleReset}
              aria-label="Reset and start over"
            >
              Reset
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
          tool="protect"
        />
      )}
    </ToolLayout>
  );
}
