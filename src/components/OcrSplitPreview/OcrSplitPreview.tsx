import type { OcrSplitPreviewProps } from "./OcrSplitPreview.types";

/**
 * Two-panel split preview for OCR results.
 * Left panel: original page image.
 * Right panel: same image with absolutely-positioned bounding box overlays.
 * Supports keyboard navigation via ArrowLeft/ArrowRight.
 *
 * Requirements: 19.1, 19.2, 19.7
 */
export function OcrSplitPreview({
  pages,
  currentPage,
  onPageChange,
}: OcrSplitPreviewProps) {
  const total = pages.length;
  const page = pages[currentPage] ?? pages[0];

  if (!page) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentPage > 0) onPageChange(currentPage - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (currentPage < total - 1) onPageChange(currentPage + 1);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`OCR split preview, page ${currentPage + 1} of ${total}`}
      style={{ outline: "none" }}
    >
      {/* Two-panel layout */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 16,
          // Stack to column on ≤768px via inline media query workaround
        }}
        className="ocr-split-panels"
      >
        {/* Left panel: original page */}
        <div
          style={{
            flex: "1 1 50%",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Original
          </div>
          <img
            src={page.imageDataUrl}
            alt={`Original page ${currentPage + 1}`}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              display: "block",
            }}
          />
        </div>

        {/* Right panel: image + bounding box overlays */}
        <div
          style={{
            flex: "1 1 50%",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Text Layer
          </div>
          <div
            style={{
              position: "relative",
              display: "inline-block",
              width: "100%",
            }}
          >
            <img
              src={page.imageDataUrl}
              alt={`Page ${currentPage + 1} with text overlay`}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                display: "block",
              }}
            />
            {/* Bounding box overlays */}
            {page.words.map((word, idx) => {
              const left = (word.bbox.x0 / page.imageWidth) * 100;
              const top = (word.bbox.y0 / page.imageHeight) * 100;
              const width =
                ((word.bbox.x1 - word.bbox.x0) / page.imageWidth) * 100;
              const height =
                ((word.bbox.y1 - word.bbox.y0) / page.imageHeight) * 100;

              return (
                <span
                  key={idx}
                  title={`${word.text} (${word.confidence}%)`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    background: "rgba(0,255,136,0.15)",
                    border: "1px solid rgba(0,255,136,0.4)",
                    cursor: "default",
                    boxSizing: "border-box",
                  }}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Page navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          marginTop: 16,
        }}
      >
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Previous page"
          style={{ minWidth: 80 }}
        >
          ← Prev
        </button>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
            minWidth: 100,
            textAlign: "center",
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          Page {currentPage + 1} of {total}
        </span>
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === total - 1}
          aria-label="Next page"
          style={{ minWidth: 80 }}
        >
          Next →
        </button>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .ocr-split-panels {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
