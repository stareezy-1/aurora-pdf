import { auroraUi } from "@/lib/aurora-theme";

const t = auroraUi.tokens.aurora;

export const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: 56,
    background: t.cosmicGray.value,
    borderBottom: `1px solid ${t.borderSubtle.value}`,
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  },
  logo: {
    color: t.auroraGreen.value,
    fontWeight: 700,
    fontSize: 18,
    textDecoration: "none",
  } as React.CSSProperties,
  links: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap" as const,
  },
  link: (isActive: boolean): React.CSSProperties => ({
    color: isActive ? t.auroraGreen.value : t.textSecondary.value,
    textDecoration: "none",
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 4,
    background: isActive ? t.successBg.value : "transparent",
    whiteSpace: "nowrap" as const,
  }),
  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
};
