"use client";

export type Theme = "light" | "dark";

const KEY = "kartuduel:theme";
const listeners = new Set<() => void>();

/** The theme on screen: a saved choice, or the system setting. */
export function currentTheme(): Theme {
  const saved = document.documentElement.dataset.theme;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
  listeners.forEach((fn) => fn());
}

export function onThemeChange(fn: () => void) {
  listeners.add(fn);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", fn);
  return () => {
    listeners.delete(fn);
    media.removeEventListener("change", fn);
  };
}
