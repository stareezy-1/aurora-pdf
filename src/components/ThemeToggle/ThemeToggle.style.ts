import { auroraUi } from "@/lib/aurora-theme";

const t = auroraUi.tokens.aurora;

export const styles = {
  btn: (isDark: boolean): React.CSSProperties => ({
    background: isDark ? t.cosmicGray.value : t.lightBg.value,
    color: isDark ? t.starWhite.value : t.deepSpace.value,
    border: "none",
    borderRadius: 20,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  }),
};
