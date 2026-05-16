import { auroraUi } from "@/lib/aurora-theme";

const t = auroraUi.tokens.aurora;

export const styles = {
  indicator: (status: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color:
      status === "processing"
        ? t.warningAmber.value
        : status === "error"
          ? t.errorRed.value
          : t.auroraGreen.value,
    padding: "4px 10px",
    borderRadius: 20,
    background:
      status === "processing"
        ? t.warningBg.value
        : status === "error"
          ? t.errorRedBg.value
          : t.successBg.value,
  }),
  card: {
    background: t.cosmicGray.value,
    borderRadius: 12,
    padding: 24,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 16,
    border: `1px solid ${t.auroraGreen.value}44`,
  },
  cardTitle: {
    color: t.auroraGreen.value,
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center" as const,
  },
  cardMeta: {
    color: t.textSecondary.value,
    fontSize: 13,
    textAlign: "center" as const,
  },
  resetBtn: {
    background: "transparent",
    border: `1px solid ${t.nebulaPurple.value}`,
    color: t.starWhite.value,
    borderRadius: 6,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 13,
  },
};
