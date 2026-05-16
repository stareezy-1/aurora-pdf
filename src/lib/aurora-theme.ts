import { createUi, token } from "@stareezy-ui/tokens";

export const auroraUi = createUi({
  tokens: {
    aurora: {
      deepSpace: token("#050505", "aurora-deep-space"),
      auroraGreen: token("#00ff88", "aurora-green"),
      starWhite: token("#ffffff", "aurora-star-white"),
      nebulaPurple: token("#7c3aed", "aurora-nebula-purple"),
      cosmicGray: token("#1a1a2e", "aurora-cosmic-gray"),
      // UI chrome tokens (not brand colors, but centralised here)
      surfaceDark: token("#0a0a1a", "aurora-surface-dark"),
      borderSubtle: token("#2a2a3e", "aurora-border-subtle"),
      textMuted: token("#888888", "aurora-text-muted"),
      textSecondary: token("#aaaaaa", "aurora-text-secondary"),
      errorRed: token("#ff4444", "aurora-error-red"),
      errorRedBg: token("#2d1a1a", "aurora-error-red-bg"),
      warningAmber: token("#f59e0b", "aurora-warning-amber"),
      warningBg: token("#2d2200", "aurora-warning-bg"),
      successBg: token("#002d1a", "aurora-success-bg"),
      disabledGray: token("#444444", "aurora-disabled-gray"),
      lightBg: token("#e5e7eb", "aurora-light-bg"),
    },
  },
  defaultTheme: "dark",
});
