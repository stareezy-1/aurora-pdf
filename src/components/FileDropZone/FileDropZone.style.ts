import { auroraUi } from "@/lib/aurora-theme";

const t = auroraUi.tokens.aurora;

export const styles = {
  zone: (isDragging: boolean, disabled: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    borderRadius: 12,
    padding: 32,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "box-shadow 0.2s ease, outline-color 0.2s ease",
    background: t.cosmicGray.value,
    border: isDragging
      ? `2px solid ${t.auroraGreen.value}`
      : "2px solid transparent",
    backgroundClip: "padding-box",
    boxShadow: isDragging
      ? `0 0 0 2px ${t.auroraGreen.value}, 0 0 24px ${t.auroraGreen.value}66`
      : `0 0 0 2px transparent`,
    outline: isDragging ? "none" : `2px solid ${t.nebulaPurple.value}`,
    outlineOffset: -2,
  }),
  icon: {
    fontSize: 40,
    marginBottom: 12,
    color: t.starWhite.value,
  } as React.CSSProperties,
  label: {
    color: t.starWhite.value,
    fontSize: 15,
    textAlign: "center" as const,
    marginBottom: 4,
  } as React.CSSProperties,
  hint: {
    color: t.textMuted.value,
    fontSize: 12,
    textAlign: "center" as const,
  } as React.CSSProperties,
  input: {
    display: "none",
  } as React.CSSProperties,
};
