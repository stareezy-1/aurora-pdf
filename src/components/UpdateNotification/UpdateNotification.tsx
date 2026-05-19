interface UpdateNotificationProps {
  onReload: () => void;
  onDismiss: () => void;
}

/**
 * UpdateNotification — fixed bottom-center toast shown when a new SW version is waiting.
 *
 * Requirements: 34.5, 34.6, 34.7
 */
export function UpdateNotification({
  onReload,
  onDismiss,
}: UpdateNotificationProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--surface)",
        border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-lg)",
        padding: "12px 16px",
        boxShadow: "var(--shadow-lg)",
        whiteSpace: "nowrap",
        animation: "fadeIn 0.3s var(--ease-out) both",
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: "var(--text-2)",
          lineHeight: 1.4,
        }}
      >
        Aurora has been updated — reload to get the latest version
      </span>
      <button
        className="btn btn-primary btn-sm"
        onClick={onReload}
        style={{ flexShrink: 0 }}
      >
        Reload
      </button>
      <button
        className="btn btn-secondary btn-sm"
        onClick={onDismiss}
        aria-label="Dismiss update notification"
        style={{ flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}
