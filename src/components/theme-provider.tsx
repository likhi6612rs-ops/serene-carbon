import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type SereneTheme = "lavender" | "blue" | "black" | "forest";

export const THEMES: { value: SereneTheme; label: string; swatch: string }[] = [
  { value: "lavender", label: "Lavender", swatch: "oklch(0.55 0.16 295)" },
  { value: "blue", label: "Professional Blue", swatch: "oklch(0.5 0.18 245)" },
  { value: "black", label: "Deep Black", swatch: "oklch(0.18 0.008 270)" },
  { value: "forest", label: "Forest Green", swatch: "oklch(0.5 0.13 150)" },
];

const STORAGE_KEY = "serene.theme";

interface ThemeContextValue {
  theme: SereneTheme;
  setTheme: (t: SereneTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(t: SereneTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", t);
  // Toggle .dark for any tailwind dark: utilities that may exist.
  document.documentElement.classList.toggle("dark", t === "black");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SereneTheme>("lavender");

  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY)) as SereneTheme | null;
    const initial: SereneTheme =
      stored && THEMES.some((t) => t.value === stored) ? stored : "lavender";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((t: SereneTheme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}