export function initTheme() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("theme");
  const dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
}

export function isDark() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}
