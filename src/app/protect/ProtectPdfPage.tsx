import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useProtectPdf } from "./hooks/useProtectPdfUpgraded";
import type { PasswordStrength } from "./hooks/useProtectPdfUpgraded";

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

  return (
    <ToolLayout toolName="Protect PDF">
      <div className="tool-header">
        <h1>🔐 Protect PDF</h1>
        <p>
          Encrypt your PDF with a password or remove an existing password. All
          processing happens locally — your file never leaves your device.
        </p>
      </div>

      {/* Mode selector */}
      <div
        role="tablist"
        aria-label="Protection mode"
        style={{ display: "flex", gap: 8, marginBottom: 4 }}
      >
        <button
          role="tab"
          aria-selected={vm.mode === "encrypt"}
          className={`btn ${
            vm.mode === "encrypt" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => vm.setMode("encrypt")}
        >
          🔒 Encrypt
        </button>
        <button
          role="tab"
          aria-selected={vm.mode === "decrypt"}
          className={`btn ${
            vm.mode === "decrypt" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => vm.setMode("decrypt")}
        >
          🔓 Remove Password
        </button>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to protect or decrypt"
          tool="protect"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* File info strip */}
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">
                {(vm.file.size / 1024).toFixed(1)} KB
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

          {/* ── ENCRYPT MODE ── */}
          {vm.mode === "encrypt" && (
            <>
              {/* User password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="label" htmlFor="user-password">
                  User Password{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    (required to open)
                  </span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="user-password"
                    className="input-field"
                    type={vm.showUserPassword ? "text" : "password"}
                    value={vm.userPassword}
                    onChange={(e) => vm.setUserPassword(e.target.value)}
                    placeholder="Enter user password…"
                    autoComplete="new-password"
                    style={{
                      paddingRight: 44,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => vm.setShowUserPassword((v) => !v)}
                    aria-label={
                      vm.showUserPassword ? "Hide password" : "Show password"
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
                    }}
                  >
                    {vm.showUserPassword ? "🙈" : "👁"}
                  </button>
                </div>

                {vm.userPassword.length > 0 && (
                  <div
                    aria-live="polite"
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
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
                    </span>
                  </div>
                )}
              </div>

              {/* Repeat user password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="label" htmlFor="repeat-password">
                  Repeat User Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="repeat-password"
                    className="input-field"
                    type={vm.showRepeatPassword ? "text" : "password"}
                    value={vm.repeatPassword}
                    onChange={(e) => vm.setRepeatPassword(e.target.value)}
                    placeholder="Repeat user password…"
                    autoComplete="new-password"
                    aria-invalid={
                      vm.repeatPassword.length > 0 && !vm.passwordsMatch
                    }
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
                    }}
                  >
                    {vm.showRepeatPassword ? "🙈" : "👁"}
                  </button>
                </div>
                {vm.repeatPassword.length > 0 && !vm.passwordsMatch && (
                  <p
                    style={{
                      color: "var(--red, #ff4444)",
                      fontSize: 12,
                      margin: 0,
                    }}
                    role="alert"
                  >
                    ⚠ Passwords do not match
                  </p>
                )}
                {vm.passwordsMatch && (
                  <p
                    style={{ color: "var(--green)", fontSize: 12, margin: 0 }}
                    aria-live="polite"
                  >
                    ✓ Passwords match
                  </p>
                )}
              </div>

              {/* Owner password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="label" htmlFor="owner-password">
                  Owner Password{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    (optional — defaults to user password)
                  </span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="owner-password"
                    className="input-field"
                    type={vm.showOwnerPassword ? "text" : "password"}
                    value={vm.ownerPassword}
                    onChange={(e) => vm.setOwnerPassword(e.target.value)}
                    placeholder="Enter owner password…"
                    autoComplete="new-password"
                    style={{
                      paddingRight: 44,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => vm.setShowOwnerPassword((v) => !v)}
                    aria-label={
                      vm.showOwnerPassword
                        ? "Hide owner password"
                        : "Show owner password"
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
                    }}
                  >
                    {vm.showOwnerPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              {/* Encryption algorithm */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="label">Encryption Algorithm</span>
                <div
                  role="radiogroup"
                  aria-label="Encryption algorithm"
                  style={{ display: "flex", gap: 12 }}
                >
                  {(["rc4-128", "aes-256"] as const).map((alg) => (
                    <label
                      key={alg}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      <input
                        type="radio"
                        name="algorithm"
                        value={alg}
                        checked={vm.algorithm === alg}
                        onChange={() => vm.setAlgorithm(alg)}
                      />
                      {alg === "rc4-128" ? "RC4 128-bit" : "AES 256-bit"}
                    </label>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    margin: 0,
                  }}
                >
                  AES 256-bit is recommended for stronger security.
                </p>
              </div>

              {/* Permissions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="label">Permissions</span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {(
                    [
                      { key: "print", label: "Allow Printing" },
                      { key: "copy", label: "Allow Copying Text" },
                      { key: "edit", label: "Allow Editing" },
                      { key: "annotate", label: "Allow Annotations" },
                    ] as const
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: vm.permissions[key]
                          ? "rgba(124,58,237,0.08)"
                          : "var(--surface-2)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={vm.permissions[key]}
                        onChange={() => vm.togglePermission(key)}
                        aria-label={label}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={vm.handleApply}
                  disabled={!vm.canEncrypt}
                  aria-label="Encrypt PDF"
                  aria-busy={vm.processor.isPending}
                >
                  🔒 Encrypt PDF
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={vm.handleReset}
                  aria-label="Reset"
                >
                  Reset
                </button>
              </div>
            </>
          )}

          {/* ── DECRYPT MODE ── */}
          {vm.mode === "decrypt" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="label" htmlFor="decrypt-password">
                  Owner Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="decrypt-password"
                    className="input-field"
                    type={vm.showDecryptPassword ? "text" : "password"}
                    value={vm.decryptPassword}
                    onChange={(e) => vm.setDecryptPassword(e.target.value)}
                    placeholder="Enter owner password to remove protection…"
                    autoComplete="current-password"
                    style={{
                      paddingRight: 44,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => vm.setShowDecryptPassword((v) => !v)}
                    aria-label={
                      vm.showDecryptPassword ? "Hide password" : "Show password"
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
                    }}
                  >
                    {vm.showDecryptPassword ? "🙈" : "👁"}
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    margin: 0,
                  }}
                >
                  Enter the owner (permissions) password to remove encryption.
                  If you only have the user password, try that instead.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={vm.handleApply}
                  disabled={!vm.canDecrypt}
                  aria-label="Remove password"
                  aria-busy={vm.processor.isPending}
                >
                  🔓 Remove Password
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={vm.handleReset}
                  aria-label="Reset"
                >
                  Reset
                </button>
              </div>
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
          onDownload={vm.clearWorkbox}
          onReset={vm.handleReset}
          tool="protect"
        />
      )}
    </ToolLayout>
  );
}
