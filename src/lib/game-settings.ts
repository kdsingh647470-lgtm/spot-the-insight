import { useEffect, useState } from "react";

// Player-tunable hit tolerance. Values are stored in localStorage so each
// device can be dialed in for its own screen size / input precision.
export type GameSettings = {
  minRadius: number;     // normalized (fraction of image width)
  bufferPct: number;     // normalized (fraction of image width)
  bufferPx: number;      // absolute pixels added on top
};

export const DEFAULT_SETTINGS: GameSettings = {
  minRadius: 0.06,
  bufferPct: 0.04,
  bufferPx: 18,
};

export const SETTINGS_BOUNDS = {
  minRadius: { min: 0.02, max: 0.15, step: 0.005, label: "Base radius", suffix: "%" as const, display: (v: number) => `${Math.round(v * 100)}%` },
  bufferPct: { min: 0,    max: 0.15, step: 0.005, label: "Percent buffer", suffix: "%" as const, display: (v: number) => `${Math.round(v * 100)}%` },
  bufferPx:  { min: 0,    max: 60,   step: 1,     label: "Pixel buffer",   suffix: "px" as const, display: (v: number) => `${v}px` },
};

const KEY = "spotdiff:settings:v1";

export function loadSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      minRadius: clamp(parsed.minRadius ?? DEFAULT_SETTINGS.minRadius, SETTINGS_BOUNDS.minRadius.min, SETTINGS_BOUNDS.minRadius.max),
      bufferPct: clamp(parsed.bufferPct ?? DEFAULT_SETTINGS.bufferPct, SETTINGS_BOUNDS.bufferPct.min, SETTINGS_BOUNDS.bufferPct.max),
      bufferPx:  clamp(parsed.bufferPx  ?? DEFAULT_SETTINGS.bufferPx,  SETTINGS_BOUNDS.bufferPx.min,  SETTINGS_BOUNDS.bufferPx.max),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: GameSettings) {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new CustomEvent("spotdiff:settings-changed", { detail: s }));
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Read localStorage in an effect (not the useState initializer) so SSR and
// hydration stay in sync — the first client render matches the server.
export function useGameSettings(): [GameSettings, (s: GameSettings) => void] {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setSettings(loadSettings());
    function onChange(e: Event) {
      const detail = (e as CustomEvent<GameSettings>).detail;
      if (detail) setSettings(detail);
    }
    window.addEventListener("spotdiff:settings-changed", onChange);
    return () => window.removeEventListener("spotdiff:settings-changed", onChange);
  }, []);
  function update(s: GameSettings) {
    setSettings(s);
    saveSettings(s);
  }
  return [settings, update];
}
