type ToolCategory = "All" | "Convert" | "Edit" | "Optimize" | "Security";

const CATEGORIES: ToolCategory[] = [
  "All",
  "Convert",
  "Edit",
  "Optimize",
  "Security",
];

interface CategoryFilterBarProps {
  active: ToolCategory;
  onChange: (cat: ToolCategory) => void;
}

/**
 * CategoryFilterBar — a row of pill buttons for filtering tools by category.
 *
 * Active button uses `btn-primary` style; inactive uses `btn-secondary`.
 *
 * Requirements: 31.2, 31.3
 */
export function CategoryFilterBar({
  active,
  onChange,
}: CategoryFilterBarProps) {
  return (
    <div
      role="group"
      aria-label="Filter tools by category"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          className={`btn btn-sm ${
            active === cat ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => onChange(cat)}
          aria-pressed={active === cat}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
