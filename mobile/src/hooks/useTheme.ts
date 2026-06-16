import { useState } from "react";
import { Colors } from "../constants/theme";

type ThemeMode = "light" | "dark";

const darkTheme = {
  ...Colors,
  background: "#162d3b",
  card: "#214559",
  textPrimary: "#f3f8fc",
  textSecondary: "#cce4f0",
};

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("light");

  const colors = mode === "dark" ? darkTheme : Colors;

  function toggleTheme() {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }

  return { mode, colors, toggleTheme };
}
