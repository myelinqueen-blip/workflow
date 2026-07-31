import { createContext, useContext, useState, useEffect } from "react";

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("wf-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem("wf-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(p => !p) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

/* ── Theme Toggle Button ── */
export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={dark ? "라이트 모드" : "다크 모드"}
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
      style={{
        background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
      }}
    >
      {dark ? (
        /* sun */
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* moon */
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
