import { auroraUi } from "@/lib/aurora-theme";

const t = auroraUi.tokens.aurora;

export const styles = {
  page: {
    minHeight: "100vh",
    background: t.deepSpace.value,
    color: t.starWhite.value,
    fontFamily: "Inter, Geist, system-ui, sans-serif",
  } as React.CSSProperties,
  main: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "24px 16px 48px",
  } as React.CSSProperties,
  skeleton: {
    height: 200,
    borderRadius: 12,
    background: t.cosmicGray.value,
    animation: "pulse 1.5s ease-in-out infinite",
  } as React.CSSProperties,
};
