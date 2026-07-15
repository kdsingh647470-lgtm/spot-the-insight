import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crosshair, RotateCcw, Check } from "lucide-react";
import { fitCalibration, useGameSettings } from "@/lib/game-settings";
import { toast } from "sonner";

// Landmark targets placed in normalized image coordinates. Corners
// exercise offset+scale; the center anchors uniform scale.
const TARGETS = [
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.5, y: 0.5 },
  { x: 0.2, y: 0.8 },
  { x: 0.8, y: 0.8 },
];

export function CalibrationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [settings, setSettings] = useGameSettings();
  const [taps, setTaps] = useState<{ x: number; y: number }[]>([]);
  const surfaceRef = useRef<HTMLDivElement>(null);

  function reset() { setTaps([]); }

  function handleOpen(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (taps.length >= TARGETS.length) return;
    const rect = surfaceRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const next = [...taps, { x, y }];
    setTaps(next);
    if (next.length === TARGETS.length) {
      const samples = TARGETS.map((t, i) => ({ target: t, tap: next[i] }));
      const fit = fitCalibration(samples, rect.width, settings);
      setSettings(fit);
      toast.success(`Calibrated · scale ${fit.scale.toFixed(2)}, buffer ${fit.bufferPx}px`);
      setTimeout(() => { reset(); onOpenChange(false); }, 700);
    }
  }

  const nextTarget = TARGETS[taps.length];
  const done = taps.length >= TARGETS.length;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crosshair className="h-5 w-5" /> Calibrate device</DialogTitle>
          <DialogDescription>
            Tap the pulsing crosshair as accurately as you can. {TARGETS.length} taps total — we'll fit tap offset, scaling, and tolerance from your results.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span>Target {Math.min(taps.length + 1, TARGETS.length)} of {TARGETS.length}</span>
            <span className={done ? "text-success" : "text-primary"}>{done ? "Done" : "Aim carefully"}</span>
          </div>
          <div
            ref={surfaceRef}
            onPointerDown={onPointerDown}
            className="relative touch-none select-none overflow-hidden rounded-2xl border border-border bg-muted"
            style={{ aspectRatio: "4/3" }}
          >
            {/* Grid guides */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:20%_20%]" />

            {/* Recorded taps */}
            {taps.map((p, i) => (
              <span
                key={i}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/70"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: 10, height: 10 }}
              />
            ))}

            {/* Faint marks for already-hit targets */}
            {TARGETS.slice(0, taps.length).map((t, i) => (
              <span
                key={`t${i}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-success/60"
                style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, width: 16, height: 16 }}
              />
            ))}

            {/* Next target crosshair */}
            {!done && nextTarget && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${nextTarget.x * 100}%`, top: `${nextTarget.y * 100}%` }}
              >
                <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary animate-ping-ring" />
                <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
                <span className="absolute left-1/2 top-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-primary/70" />
                <span className="absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-primary/70" />
              </div>
            )}

            {done && (
              <div className="absolute inset-0 grid place-items-center bg-success/10">
                <div className="flex items-center gap-2 rounded-full bg-success px-4 py-1 text-sm font-black text-success-foreground">
                  <Check className="h-4 w-4" /> Calibration saved
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(taps.length / TARGETS.length) * 100}%` }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={reset} disabled={taps.length === 0}>
            <RotateCcw className="mr-1 h-4 w-4" /> Redo taps
          </Button>
          <Button variant="secondary" onClick={() => handleOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
