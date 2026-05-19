import { parseRange } from "@/lib/range-parser";

interface PageRangeChipsProps {
  rangeStr: string;
  pageCount: number;
}

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  padding: "2px 8px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.6,
};

/**
 * PageRangeChips — renders a flex-wrap row of page number chips.
 *
 * Included pages (in the parsed range) are highlighted green;
 * excluded pages use the muted surface color.
 *
 * Max 20 chips: if pageCount > 20, shows first 10 + "…" + last 10.
 *
 * Requirements: 28.1, 28.2, 28.3
 */
export function PageRangeChips({ rangeStr, pageCount }: PageRangeChipsProps) {
  if (pageCount <= 0) return null;

  const included = new Set(parseRange(rangeStr, pageCount));

  // Build the list of page numbers to display (with optional ellipsis)
  const pages: Array<number | "ellipsis"> = [];

  if (pageCount <= 20) {
    for (let i = 1; i <= pageCount; i++) {
      pages.push(i);
    }
  } else {
    // First 10
    for (let i = 1; i <= 10; i++) {
      pages.push(i);
    }
    pages.push("ellipsis");
    // Last 10
    for (let i = pageCount - 9; i <= pageCount; i++) {
      pages.push(i);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 8,
      }}
      aria-label="Page range preview"
    >
      {pages.map((item, idx) => {
        if (item === "ellipsis") {
          return (
            <span
              key={`ellipsis-${idx}`}
              style={{
                ...chipBase,
                background: "transparent",
                color: "var(--text-muted)",
              }}
              aria-hidden="true"
            >
              …
            </span>
          );
        }

        const isIncluded = included.has(item);
        return (
          <span
            key={item}
            style={{
              ...chipBase,
              background: isIncluded
                ? "rgba(0,255,136,0.15)"
                : "var(--surface-3)",
              color: isIncluded ? "var(--green)" : "var(--text-muted)",
            }}
            aria-label={`Page ${item}${isIncluded ? " included" : " excluded"}`}
          >
            {item}
          </span>
        );
      })}
    </div>
  );
}
