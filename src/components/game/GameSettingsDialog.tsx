import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS, SETTINGS_BOUNDS, useGameSettings, type GameSettings } from "@/lib/game-settings";
import { RotateCcw, Target } from "lucide-react";

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
