import { useEffect, useState } from "react";

const KEY = "lm_theme";
const ORDER = ["system", "light", "dark"];

function apply(mode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
}

/** Theme mode: "system" follows the OS, or force "light" / "dark". */
export function useTheme() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; }
  });
  useEffect(() => {
    apply(mode);
    try {
      if (mode === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch { /* storage unavailable */ }
  }, [mode]);
  const cycle = () => setMode((m) => ORDER[(ORDER.indexOf(m) + 1) % ORDER.length]);
  return { mode, setMode, cycle };
}
