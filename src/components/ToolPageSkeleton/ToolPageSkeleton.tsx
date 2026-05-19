interface ToolPageSkeletonProps {
  /** When true, uses a 1280px max-width container (matches ToolLayout wide prop) */
  wide?: boolean;
}

const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: "var(--radius-md)",
};

/**
 * ToolPageSkeleton — three shimmer blocks approximating the tool page layout.
 *
 * Shown while a lazy-loaded route is loading (replaces blank screen).
 * Uses the existing `shimmer` keyframe from index.css.
 *
 * Requirements: 2.2, 2.3, 13.2, 13.3
 */
export function ToolPageSkeleton({ wide = false }: ToolPageSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading tool…"
      style={{
        width: "100%",
        maxWidth: wide ? 1280 : 780,
        margin: "0 auto",
        padding: "32px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header block — tool title / breadcrumb area */}
      <div
        style={{
          ...shimmerStyle,
          height: 60,
        }}
      />

      {/* Drop zone block */}
      <div
        style={{
          ...shimmerStyle,
          height: 180,
        }}
      />

      {/* Action / config block */}
      <div
        style={{
          ...shimmerStyle,
          height: 80,
        }}
      />
    </div>
  );
}
