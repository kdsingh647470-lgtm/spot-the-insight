import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS, PRESETS, SETTINGS_BOUNDS, applyPreset, matchPreset, useGameSettings, type GameSettings } from "@/lib/game-settings";
import { CalibrationDialog } from "@/components/game/CalibrationDialog";
import { Crosshair, RotateCcw, Target } from "lucide-react";

export function GameSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [settings, setSettings] = useGameSettings();
  function set<K extends keyof GameSettings>(k: K, v: number) {
    setSettings({ ...settings, [k]: v });
  }
  return (
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
                    onClick={() => setSettings({ ...p.values })}
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
          {(Object.keys(SETTINGS_BOUNDS) as (keyof GameSettings)[]).map((key) => {
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
  );
}
