import { useEffect, useState } from "react";

const KEY = "spotdiff:muted:v1";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setMuted(v: boolean) {
  try { window.localStorage.setItem(KEY, v ? "1" : "0"); } catch {}
  window.dispatchEvent(new CustomEvent("spotdiff:mute-changed", { detail: v }));
}

export function useMuted(): [boolean, (v: boolean) => void] {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(isMuted());
    const on = (e: Event) => setM(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener("spotdiff:mute-changed", on);
    return () => window.removeEventListener("spotdiff:mute-changed", on);
  }, []);
  return [m, (v) => { setM(v); setMuted(v); }];
}

export function playBeep(freq: number, dur = 0.1, type: OscillatorType = "sine") {
  if (isMuted()) return;
  try {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

// Continue-playing state
const RESUME_KEY = "spotdiff:resume:v1";
export type ResumeState = { mode: string; levelId?: string; title?: string; savedAt: number };
export function saveResume(s: ResumeState) {
  try { window.localStorage.setItem(RESUME_KEY, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new CustomEvent("spotdiff:resume-changed"));
}
export function loadResume(): ResumeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    return raw ? JSON.parse(raw) as ResumeState : null;
  } catch { return null; }
}
export function clearResume() {
  try { window.localStorage.removeItem(RESUME_KEY); } catch {}
  window.dispatchEvent(new CustomEvent("spotdiff:resume-changed"));
}
export function useResume(): ResumeState | null {
  const [r, setR] = useState<ResumeState | null>(null);
  useEffect(() => {
    setR(loadResume());
    const on = () => setR(loadResume());
    window.addEventListener("spotdiff:resume-changed", on);
    return () => window.removeEventListener("spotdiff:resume-changed", on);
  }, []);
  return r;
}
