import { useAuroraStore } from "@/stores/aurora.store";
import { styles } from "./ThemeToggle.style";

export function ThemeToggle() {
  const theme = useAuroraStore((s) => s.theme);
  const toggleTheme = useAuroraStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      style={styles.btn(isDark)}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={isDark}
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
