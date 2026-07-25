import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRef, useState, useEffect, useMemo, forwardRef, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getAdminLevel, setDifferences, publishLevel } from "@/lib/admin.functions";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, CheckCircle2, Eye, EyeOff, Target, Grid3x3, Play, Pencil, RotateCcw, Check, X as XIcon } from "lucide-react";
import { useGameSettings, calibrateTap } from "@/lib/game-settings";

export const Route = createFileRoute("/_authenticated/admin/levels/$id")({
  component: LevelEditor,
});

type Diff = { x: number; y: number; radius: number; label?: string | null };

// Must match the game engine (see Game.tsx handleTap).
const MARKER_RADIUS = 0.06;

function LevelEditor() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["adminLevel", id], queryFn: () => getAdminLevel({ data: { id } }) });
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showHitArea, setShowHitArea] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [settings] = useGameSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    if (q.data?.differences) {
      setDiffs(q.data.differences.map((d) => ({ x: Number(d.x), y: Number(d.y), radius: Number(d.radius) })));
    }
  }, [q.data?.differences]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerW(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: () => setDifferences({ data: { level_id: id, diffs } }),
    onSuccess: () => toast.success(`Saved ${diffs.length} differences`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const pub = useMutation({
    mutationFn: () => publishLevel({ data: { id, published: !q.data?.level.published } }),
    onSuccess: () => { toast.success("Publish state changed"); q.refetch(); },
  });

  // Hit tolerance in normalized-x units, mirroring Game.tsx exactly.
  const toleranceFor = useMemo(() => {
    const pxBufferNorm = containerW > 0 ? settings.bufferPx / containerW : 0;
    return (radius: number) => {
      const authored = radius > 0 ? radius : settings.minRadius;
      const effective = Math.min(Math.max(authored, settings.minRadius), MARKER_RADIUS);
      const rawBuffer = settings.bufferPct + pxBufferNorm;
      const buffer = Math.min(rawBuffer, effective * 0.2);
      return { effective, tolerance: effective + buffer };
    };
  }, [settings, containerW]);

  function onImageClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDiffs((prev) => {
      const next = [...prev, { x, y, radius: 0.05 }];
      setSelected(next.length - 1);
      return next;
    });
  }
  function removeAt(i: number) {
    setDiffs((prev) => prev.filter((_, idx) => idx !== i));
    setSelected(null);
  }
  function updateSelectedRadius(v: number) {
    if (selected === null) return;
    setDiffs((prev) => prev.map((d, i) => (i === selected ? { ...d, radius: v } : d)));
  }

  if (q.isLoading || !q.data) {
    return <div className="min-h-dvh bg-background"><AppHeader /><p className="p-6">Loading…</p></div>;
  }

  const count = diffs.length;
  const countColor = count === 5 ? "text-success" : count > 5 ? "text-destructive" : "text-warning";
  const sel = selected !== null ? diffs[selected] : null;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-2xl font-black">{q.data.level.title}</h1>
          <span className={`ml-auto rounded-full bg-muted px-3 py-1 text-sm font-bold ${countColor}`}>{count}/5 marks</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Tap image A to place a difference. Click a marker to select it, then adjust its radius. The dashed ring shows the effective player hit area using your current game settings.
        </p>

        {/* Overlay toolbar */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Switch id="ov" checked={showOverlay} onCheckedChange={setShowOverlay} />
            <Label htmlFor="ov" className="flex cursor-pointer items-center gap-1 text-sm">
              {showOverlay ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} Markers
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="hit" checked={showHitArea} onCheckedChange={setShowHitArea} disabled={!showOverlay} />
            <Label htmlFor="hit" className="flex cursor-pointer items-center gap-1 text-sm">
              <Target className="h-4 w-4" /> Hit area
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="grid" checked={showGrid} onCheckedChange={setShowGrid} />
            <Label htmlFor="grid" className="flex cursor-pointer items-center gap-1 text-sm">
              <Grid3x3 className="h-4 w-4" /> Grid
            </Label>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            tolerance≈{Math.round((toleranceFor(sel?.radius ?? settings.minRadius).tolerance) * 100)}% of width
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ImageSurface
            ref={containerRef}
            src={q.data.signedA}
            alt="A"
            interactive
            onClick={onImageClick}
            diffs={diffs}
            selected={selected}
            onSelect={setSelected}
            showOverlay={showOverlay}
            showHitArea={showHitArea}
            showGrid={showGrid}
            toleranceFor={toleranceFor}
          />
          <ImageSurface
            src={q.data.signedB}
            alt="B"
            diffs={diffs}
            selected={selected}
            onSelect={setSelected}
            showOverlay={showOverlay}
            showHitArea={showHitArea}
            showGrid={showGrid}
            toleranceFor={toleranceFor}
          />
        </div>

        {/* Selected marker inspector */}
        {sel && (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">Marker #{(selected ?? 0) + 1}</div>
              <Button variant="ghost" size="sm" onClick={() => removeAt(selected!)}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              x: {(sel.x * 100).toFixed(1)}% · y: {(sel.y * 100).toFixed(1)}% · radius: {(sel.radius * 100).toFixed(1)}%
            </div>
            <Label className="text-xs">Radius</Label>
            <Slider
              value={[sel.radius]}
              min={0.02}
              max={0.12}
              step={0.005}
              onValueChange={(v) => updateSelectedRadius(v[0])}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="mr-1 h-4 w-4" /> Save differences ({count})
          </Button>
          <Button variant="secondary" onClick={() => pub.mutate()}>
            <CheckCircle2 className="mr-1 h-4 w-4" /> {q.data.level.published ? "Unpublish" : "Publish"}
          </Button>
          <Button variant="ghost" onClick={() => { setDiffs([]); setSelected(null); }}>
            <Trash2 className="mr-1 h-4 w-4" /> Clear
          </Button>
        </div>
      </main>
    </div>
  );
}

type SurfaceProps = {
  src: string;
  alt: string;
  diffs: Diff[];
  selected: number | null;
  onSelect: (i: number | null) => void;
  showOverlay: boolean;
  showHitArea: boolean;
  showGrid: boolean;
  toleranceFor: (r: number) => { effective: number; tolerance: number };
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

const ImageSurface = forwardRef<HTMLDivElement, SurfaceProps>(function ImageSurface(
  { src, alt, diffs, selected, onSelect, showOverlay, showHitArea, showGrid, toleranceFor, interactive, onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      className="relative select-none overflow-hidden rounded-3xl border border-border bg-muted"
      style={{ aspectRatio: "4/3", cursor: interactive ? "crosshair" : "default" }}
      onClick={interactive ? onClick : undefined}
    >
      <img src={src} className="pointer-events-none absolute inset-0 h-full w-full object-cover" alt={alt} />
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--foreground) / 0.4) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.4) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />
      )}
      {showOverlay &&
        diffs.map((d, i) => {
          const isSel = i === selected;
          const { tolerance } = toleranceFor(d.radius);
          const markerSize = d.radius * 2 * 100;
          const hitSize = tolerance * 2 * 100;
          return (
            <div key={i}>
              {showHitArea && (
                <span
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-primary/70"
                  style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${hitSize}%`, aspectRatio: "1" }}
                />
              )}
              <span
                onClick={(e) => { e.stopPropagation(); onSelect(isSel ? null : i); }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-4 transition-all ${
                  isSel
                    ? "border-success bg-success/40 shadow-lg ring-2 ring-success/50"
                    : "border-warning bg-warning/30 hover:bg-warning/50"
                }`}
                style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${markerSize}%`, aspectRatio: "1" }}
              />
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-black leading-none text-background shadow"
                style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }}
              >
                {i + 1}
              </span>
            </div>
          );
        })}
    </div>
  );
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ImageSurface = ImageSurface;
