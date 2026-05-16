import { auroraUi } from "@/lib/aurora-theme";

const t = auroraUi.tokens.aurora;

export const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: t.textMuted.value,
    padding: "8px 0",
  } as React.CSSProperties,
  link: {
    color: t.auroraGreen.value,
    textDecoration: "none",
  } as React.CSSProperties,
  separator: {
    color: t.borderSubtle.value,
  } as React.CSSProperties,
  current: {
    color: t.starWhite.value,
  } as React.CSSProperties,
};
