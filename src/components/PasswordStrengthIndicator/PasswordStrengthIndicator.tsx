import { scorePassword } from "@/lib/password-strength";

interface PasswordStrengthIndicatorProps {
  password: string;
}

type Score = 0 | 1 | 2 | 3;

const SEGMENT_COLORS: Record<Score, string> = {
  0: "var(--surface-3)",
  1: "var(--red)",
  2: "var(--amber)",
  3: "var(--green)",
};

const LABELS: Record<Score, string> = {
  0: "Weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
};

const LABEL_COLORS: Record<Score, string> = {
  0: "var(--text-muted)",
  1: "var(--red)",
  2: "var(--amber)",
  3: "var(--green)",
};

/**
 * PasswordStrengthIndicator — 3-segment bar showing password strength.
 *
 * Score 0: all segments gray
 * Score 1: first segment red, rest gray
 * Score 2: first two segments amber, last gray
 * Score 3: all segments green
 *
 * Label: "Weak" (0–1), "Fair" (2), "Strong" (3)
 *
 * Requirements: 28.4
 */
export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const score = scorePassword(password);

  const getSegmentColor = (segmentIndex: number): string => {
    // segmentIndex is 0-based (0, 1, 2)
    // A segment is filled if its index < score
    if (score === 0) return "var(--surface-3)";
    if (segmentIndex < score) {
      return SEGMENT_COLORS[score];
    }
    return "var(--surface-3)";
  };

  return (
    <div
      style={{ marginTop: 8 }}
      aria-label={`Password strength: ${LABELS[score]}`}
    >
      {/* 3-segment bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 6,
        }}
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: getSegmentColor(i),
              transition: "background 200ms var(--ease-out)",
            }}
          />
        ))}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: LABEL_COLORS[score],
          transition: "color 200ms var(--ease-out)",
        }}
      >
        {LABELS[score]}
      </span>
    </div>
  );
}
