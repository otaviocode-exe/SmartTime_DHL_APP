import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = "dhl_theme";
export const THEMES = ["light", "dark"];

export function ThemeProvider({ children }) {
  const [theme, _setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const v = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : "light";
  });

  const setTheme = useCallback((t) => {
    if (!THEMES.includes(t)) return;
    window.localStorage.setItem(STORAGE_KEY, t);
    _setTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-light", "theme-dark");
    html.classList.add(`theme-${theme}`);
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
