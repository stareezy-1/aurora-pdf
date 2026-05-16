import { auroraUi } from "@/lib/aurora-theme";

const t = auroraUi.tokens.aurora;

export const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    padding: "16px 0",
  },
  track: {
    position: "relative" as const,
    height: 8,
    borderRadius: 4,
    background: t.borderSubtle.value,
    overflow: "hidden" as const,
  },
  fill: (pct: number): React.CSSProperties => ({
    height: "100%",
    width: `${pct}%`,
    background: t.auroraGreen.value,
    borderRadius: 4,
    transition: "width 0.3s ease",
  }),
  label: {
    color: t.textSecondary.value,
    fontSize: 13,
    textAlign: "center" as const,
  },
  errorBox: {
    background: t.errorRedBg.value,
    border: `1px solid ${t.errorRed.value}`,
    borderRadius: 8,
    padding: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    alignItems: "flex-start" as const,
  },
  errorText: {
    color: t.errorRed.value,
    fontSize: 14,
  },
  retryBtn: {
    background: t.nebulaPurple.value,
    color: t.starWhite.value,
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 13,
  },
  successBox: {
    color: t.auroraGreen.value,
    fontSize: 14,
    textAlign: "center" as const,
    padding: "8px 0",
  },
  starDot: (delay: number): React.CSSProperties => ({
    position: "absolute" as const,
    top: "50%",
    transform: "translateY(-50%)",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: t.auroraGreen.value,
    animation: `starPulse 1.4s ${delay}s ease-in-out infinite`,
    opacity: 0,
  }),
};
