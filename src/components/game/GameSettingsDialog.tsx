import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS, PRESETS, SETTINGS_BOUNDS, applyPreset, matchPreset, useGameSettings, type GameSettings } from "@/lib/game-settings";
import { CalibrationDialog } from "@/components/game/CalibrationDialog";
import { Crosshair, RotateCcw, Target } from "lucide-react";

type TuneKey = "minRadius" | "bufferPct" | "bufferPx";
const TUNE_KEYS: TuneKey[] = ["minRadius", "bufferPct", "bufferPx"];

export function GameSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [settings, setSettings] = useGameSettings();
  const [calOpen, setCalOpen] = useState(false);
  function set<K extends keyof GameSettings>(k: K, v: number) {
    setSettings({ ...settings, [k]: v });
  }
  const calibrated = settings.offsetX !== 0 || settings.offsetY !== 0 || settings.scale !== 1;
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Tap accuracy</DialogTitle>
            <DialogDescription>Adjust how forgiving tap detection is on your device. Bigger values make near-misses count as correct.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Presets</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const active = matchPreset(settings) === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSettings(applyPreset(settings, p.id))}
                      className={`rounded-2xl border p-2 text-center transition ${active ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                      aria-pressed={active}
                    >
                      <div className="text-sm font-black">{p.label}</div>
                      <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{p.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-black">Device calibration</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                    {calibrated
                      ? `Active · scale ${settings.scale.toFixed(2)}, offset ${(settings.offsetX * 100).toFixed(1)}%, ${(settings.offsetY * 100).toFixed(1)}%`
                      : "Tap 4 targets to auto-fit tolerance and coordinate scaling."}
                  </div>
                </div>
                <Button size="sm" variant={calibrated ? "secondary" : "default"} onClick={() => setCalOpen(true)}>
                  <Crosshair className="mr-1 h-4 w-4" /> {calibrated ? "Recalibrate" : "Calibrate"}
                </Button>
              </div>
              {calibrated && (
                <button
                  type="button"
                  className="mt-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setSettings({ ...settings, offsetX: 0, offsetY: 0, scale: 1 })}
                >
                  Clear calibration
                </button>
              )}
            </div>

            {TUNE_KEYS.map((key) => {
              const b = SETTINGS_BOUNDS[key];
              return (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between text-sm font-bold">
                    <span>{b.label}</span>
                    <span className="tabular-nums text-muted-foreground">{b.display(settings[key])}</span>
                  </div>
                  <Slider
                    min={b.min}
                    max={b.max}
                    step={b.step}
                    value={[settings[key]]}
                    onValueChange={([v]) => set(key, v)}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setSettings(DEFAULT_SETTINGS)}>
              <RotateCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CalibrationDialog open={calOpen} onOpenChange={setCalOpen} />
    </>
  );
}
