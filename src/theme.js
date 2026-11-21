import { useEffect, useState } from "react";

// Mirrors the mobile app's theme.tsx: a "system" | "light" | "dark" mode,
// persisted in localStorage, resolved against the OS/browser's preference
// when set to "system". Applying it is just toggling a class — every
// color in index.css is a CSS variable already, so the page repaints
// instantly with no React re-render needed for the colors themselves.
const STORAGE_KEY = "themeMode";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveEffective(mode) {
  if (mode === "light" || mode === "dark") return mode;
  return systemPrefersDark() ? "dark" : "light";
}

function applyEffective(effective) {
  document.documentElement.classList.toggle("dark", effective === "dark");
}

function getStoredMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch (e) {
    // localStorage unavailable (private mode, etc.) — fall back to system.
  }
  return "system";
}

// Applied once at module load, before the first paint, so the page never
// flashes the wrong theme while React is still mounting.
applyEffective(resolveEffective(getStoredMode()));

export function useThemeMode() {
  const [mode, setModeState] = useState(getStoredMode);

  useEffect(() => {
    applyEffective(resolveEffective(mode));
  }, [mode]);

  useEffect(() => {
    if (mode !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyEffective(resolveEffective("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = (next) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // Ignore — the in-memory mode for this tab still works.
    }
  };

  return { mode, setMode };
}
