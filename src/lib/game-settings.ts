import { useEffect, useState } from "react";

// Player-tunable hit tolerance. Values are stored in localStorage so each
// device can be dialed in for its own screen size / input precision.
export type GameSettings = {
  minRadius: number;     // normalized (fraction of image width)
  bufferPct: number;     // normalized (fraction of image width)
  bufferPx: number;      // absolute pixels added on top
  // Calibration transform: adjustedX = (tapX - offsetX) / scale.
  // Defaults are identity (no adjustment).
  offsetX: number;
  offsetY: number;
  scale: number;
};

export const DEFAULT_SETTINGS: GameSettings = {
  minRadius: 0.06,
  bufferPct: 0.04,
  bufferPx: 18,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

export type PresetId = "precise" | "balanced" | "relaxed";

// Presets only touch the tolerance knobs, not the calibration transform.
type TolerancePreset = Pick<GameSettings, "minRadius" | "bufferPct" | "bufferPx">;

export const PRESETS: { id: PresetId; label: string; description: string; values: TolerancePreset }[] = [
  { id: "precise",  label: "Precise",  description: "Tight hitboxes for pointer play.", values: { minRadius: 0.04, bufferPct: 0.01, bufferPx: 6 } },
  { id: "balanced", label: "Balanced", description: "Default forgiveness for most devices.", values: { minRadius: DEFAULT_SETTINGS.minRadius, bufferPct: DEFAULT_SETTINGS.bufferPct, bufferPx: DEFAULT_SETTINGS.bufferPx } },
  { id: "relaxed",  label: "Relaxed",  description: "Generous taps for small screens.", values: { minRadius: 0.08, bufferPct: 0.07, bufferPx: 32 } },
];

export function applyPreset(current: GameSettings, id: PresetId): GameSettings {
  const p = PRESETS.find((x) => x.id === id);
  return p ? { ...current, ...p.values } : current;
}

export function matchPreset(s: GameSettings): PresetId | null {
  const eq = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
  const found = PRESETS.find((p) =>
    eq(p.values.minRadius, s.minRadius, 0.003) &&
    eq(p.values.bufferPct, s.bufferPct, 0.003) &&
    eq(p.values.bufferPx,  s.bufferPx,  0.5),
  );
  return found?.id ?? null;
}

export const SETTINGS_BOUNDS = {
  minRadius: { min: 0.02, max: 0.15, step: 0.005, label: "Base radius", suffix: "%" as const, display: (v: number) => `${Math.round(v * 100)}%` },
  bufferPct: { min: 0,    max: 0.15, step: 0.005, label: "Percent buffer", suffix: "%" as const, display: (v: number) => `${Math.round(v * 100)}%` },
  bufferPx:  { min: 0,    max: 60,   step: 1,     label: "Pixel buffer",   suffix: "px" as const, display: (v: number) => `${v}px` },
} as const;

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
      offsetX:   clamp(parsed.offsetX   ?? 0, -0.25, 0.25),
      offsetY:   clamp(parsed.offsetY   ?? 0, -0.25, 0.25),
      scale:     clamp(parsed.scale     ?? 1,  0.7,  1.3),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Apply the calibration transform to a raw normalized tap coordinate,
// returning the coordinate in the difference's own space.
export function calibrateTap(px: number, py: number, s: GameSettings): { x: number; y: number } {
  const scale = s.scale || 1;
  return { x: (px - s.offsetX) / scale, y: (py - s.offsetY) / scale };
}

// Fit an offset + uniform scale from tapped points to their target
// positions using least squares, and derive a pixel buffer from the
// residuals. `containerWidth` is the tap surface width in CSS pixels.
export function fitCalibration(
  samples: { target: { x: number; y: number }; tap: { x: number; y: number } }[],
  containerWidth: number,
  current: GameSettings,
): GameSettings {
  if (samples.length < 2 || containerWidth <= 0) return current;
  const n = samples.length;
  let mTx = 0, mTy = 0, mtx = 0, mty = 0;
  for (const s of samples) { mTx += s.target.x; mTy += s.target.y; mtx += s.tap.x; mty += s.tap.y; }
  mTx /= n; mTy /= n; mtx /= n; mty /= n;
  let num = 0, den = 0;
  for (const s of samples) {
    const Tx = s.target.x - mTx, Ty = s.target.y - mTy;
    const tx = s.tap.x - mtx,    ty = s.tap.y - mty;
    num += Tx * tx + Ty * ty;
    den += Tx * Tx + Ty * Ty;
  }
  const scale = clamp(den > 1e-6 ? num / den : 1, 0.7, 1.3);
  const offsetX = clamp(mtx - scale * mTx, -0.25, 0.25);
  const offsetY = clamp(mty - scale * mTy, -0.25, 0.25);
  let maxResid = 0;
  for (const s of samples) {
    const dx = s.tap.x - (s.target.x * scale + offsetX);
    const dy = s.tap.y - (s.target.y * scale + offsetY);
    maxResid = Math.max(maxResid, Math.hypot(dx, dy));
  }
  const bufferPx = clamp(
    Math.ceil(maxResid * containerWidth) + 6,
    SETTINGS_BOUNDS.bufferPx.min,
    SETTINGS_BOUNDS.bufferPx.max,
  );
  return { ...current, offsetX, offsetY, scale, bufferPx };
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
