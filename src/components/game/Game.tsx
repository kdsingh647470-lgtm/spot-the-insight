import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Heart, Lightbulb, Pause, Play, Timer, X, RotateCcw, Home, Star, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getLevelById, submitCompletion, spendHint, getRandomLevel, getDailyLevel } from "@/lib/levels.functions";

type Mode = "story" | "daily" | "infinite" | "timed" | "relax";
type Diff = { id: string; x: number; y: number; radius: number; label: string | null };
type Found = { id: string; x: number; y: number };

const TAP_TOLERANCE = 0.06;

export function Game({ mode, levelId: initialLevelId }: { mode: Mode; levelId?: string }) {
  const navigate = useNavigate();
  const [levelId, setLevelId] = useState<string | null>(initialLevelId ?? null);
  const [loadingPick, setLoadingPick] = useState(!initialLevelId);

  useEffect(() => {
    if (initialLevelId) return;
    (async () => {
      const id = mode === "daily" ? await getDailyLevel() : await getRandomLevel();
      if (!id) { toast.error("No levels available yet. Ask an admin to add some!"); navigate({ to: "/" }); return; }
      setLevelId(id);
      setLoadingPick(false);
    })();
  }, [initialLevelId, mode, navigate]);

  const lvlQ = useQuery({
    queryKey: ["level", levelId],
    queryFn: () => getLevelById({ data: { id: levelId! } }),
    enabled: !!levelId,
  });

  if (loadingPick || !levelId || lvlQ.isLoading) {
    return <div className="grid min-h-dvh place-items-center">Loading…</div>;
  }
  if (lvlQ.error || !lvlQ.data) {
    return <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Could not load level</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/" })}>Home</Button>
      </div>
    </div>;
  }
  return <GameInner mode={mode} data={lvlQ.data} onNext={async () => {
    const id = mode === "daily" ? await getDailyLevel() : await getRandomLevel();
    if (id) setLevelId(id);
    lvlQ.refetch();
  }} />;
}

function GameInner({ mode, data, onNext }: {
  mode: Mode;
  data: { id: string; title: string; image_a_url: string; image_b_url: string; differences: Diff[] };
  onNext: () => void;
}) {
  const navigate = useNavigate();
  const totalDiffs = data.differences.length || 5;
  const [found, setFound] = useState<Found[]>([]);
  const [lives, setLives] = useState(3);
  const [hints, setHints] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [wrong, setWrong] = useState<{ x: number; y: number; k: number } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [hintTarget, setHintTarget] = useState<Diff | null>(null);
  const [showResult, setShowResult] = useState<null | "win" | "lose">(null);
  const [score, setScore] = useState(0);
  const [session, setSession] = useState<any>(null);
  const startRef = useRef(Date.now());
  const timeLimit = mode === "timed" ? 90 : mode === "relax" ? undefined : undefined;
  const infiniteHints = mode === "relax";

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSession(data.session)); }, []);
  useEffect(() => {
    if (paused || showResult) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [paused, showResult]);

  useEffect(() => {
    if (timeLimit && elapsed >= timeLimit && !showResult) setShowResult("lose");
  }, [elapsed, timeLimit, showResult]);

  const submitMut = useMutation({ mutationFn: submitCompletion });

  function playBeep(freq: number, dur = 0.1, type: OscillatorType = "sine") {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch {}
  }

  function handleTap(px: number, py: number) {
    if (paused || showResult) return;
    const hit = data.differences.find((d) => !found.some((f) => f.id === d.id) && Math.hypot(d.x - px, d.y - py) <= Math.max(d.radius, TAP_TOLERANCE));
    if (hit) {
      playBeep(880, 0.12, "triangle");
      const nf = [...found, { id: hit.id, x: hit.x, y: hit.y }];
      setFound(nf);
      setScore((s) => s + 100);
      if (nf.length >= totalDiffs) {
        setShowResult("win");
        void (async () => {
          if (session) {
            try {
              const r = await submitMut.mutateAsync({ data: { level_id: data.id, time_ms: (Date.now() - startRef.current), hints_used: hints, mistakes, mode: mode === "story" ? "story" : mode } });
              setScore((s) => s + r.coinsEarned);
            } catch {}
          }
        })();
      }
    } else {
      playBeep(180, 0.15, "square");
      setWrong({ x: px, y: py, k: Date.now() });
      setShakeKey((k) => k + 1);
      setMistakes((m) => m + 1);
      if (!infiniteHints) {
        setLives((l) => {
          const nl = l - 1;
          if (nl <= 0) setShowResult("lose");
          return nl;
        });
      }
    }
  }

  async function useHint() {
    const remaining = data.differences.filter((d) => !found.some((f) => f.id === d.id));
    if (!remaining.length) return;
    if (!infiniteHints && session) {
      try {
        await spendHint();
        toast.success("Used a hint (−25 coins)");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Not enough coins");
        return;
      }
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setHintTarget(pick);
    setHints((h) => h + 1);
    setTimeout(() => setHintTarget(null), 1500);
  }

  function reset() {
    setFound([]); setLives(3); setHints(0); setMistakes(0); setElapsed(0); setScore(0);
    setShowResult(null); startRef.current = Date.now();
  }

  const remainingCount = totalDiffs - found.length;
  const stars = mistakes === 0 && hints === 0 ? 3 : mistakes <= 1 ? 2 : 1;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* HUD */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-background/80 px-3 py-2 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })} aria-label="Home"><Home className="h-5 w-5" /></Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`h-5 w-5 ${i < lives ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`} />
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-bold tabular-nums">
          <Timer className="h-4 w-4" /> {formatTime(timeLimit ? Math.max(0, timeLimit - elapsed) : elapsed)}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          <Sparkles className="h-4 w-4" /> {found.length}/{totalDiffs}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setPaused(true)} aria-label="Pause"><Pause className="h-5 w-5" /></Button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 md:flex-row md:items-stretch">
        <GameImage src={data.image_a_url} onTap={handleTap} found={found} wrong={wrong} hint={hintTarget} shakeKey={shakeKey} />
        <GameImage src={data.image_b_url} onTap={handleTap} found={found} wrong={wrong} hint={hintTarget} shakeKey={shakeKey} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-background/80 px-3 py-3 backdrop-blur">
        <Button variant="secondary" onClick={useHint}>
          <Lightbulb className="mr-1 h-4 w-4" /> Hint {infiniteHints ? "" : "(25)"}
        </Button>
        <div className="text-sm font-bold tabular-nums">Score {score}</div>
        <Button variant="ghost" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" /> Restart</Button>
      </div>

      <AnimatePresence>
        {paused && (
          <ModalCard onDismiss={() => setPaused(false)}>
            <h2 className="text-2xl font-black">Paused</h2>
            <p className="mt-1 text-sm text-muted-foreground">Take a breath.</p>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => setPaused(false)}><Play className="mr-1 h-4 w-4" /> Resume</Button>
              <Button variant="secondary" onClick={() => navigate({ to: "/" })}>Home</Button>
            </div>
          </ModalCard>
        )}
        {showResult === "win" && (
          <ModalCard>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-2xl font-black">Level cleared!</h2>
              <div className="mt-2 flex justify-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star key={i} className={`h-8 w-8 ${i < stars ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <Stat label="Time" value={formatTime(Math.floor((Date.now() - startRef.current) / 1000))} />
                <Stat label="Mistakes" value={String(mistakes)} />
                <Stat label="Hints" value={String(hints)} />
              </div>
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 font-bold text-warning">
                <Coins className="h-4 w-4" /> +{score}
              </div>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1" onClick={() => { reset(); onNext(); }}>Next level</Button>
                <Button variant="secondary" onClick={() => navigate({ to: "/" })}>Home</Button>
              </div>
            </div>
          </ModalCard>
        )}
        {showResult === "lose" && (
          <ModalCard>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <X className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-2xl font-black">Out of {timeLimit ? "time" : "lives"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">You found {found.length} of {totalDiffs} differences.</p>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" /> Retry</Button>
                <Button variant="secondary" onClick={() => navigate({ to: "/" })}>Home</Button>
              </div>
            </div>
          </ModalCard>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalCard({ children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

function GameImage({
  src, onTap, found, wrong, hint, shakeKey,
}: {
  src: string;
  onTap: (x: number, y: number) => void;
  found: Found[];
  wrong: { x: number; y: number; k: number } | null;
  hint: Diff | null;
  shakeKey: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function onClick(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    onTap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  }
  return (
    <div
      key={shakeKey}
      ref={ref}
      onPointerDown={onClick}
      className="relative flex-1 select-none overflow-hidden rounded-3xl border border-border bg-muted shadow-soft data-[shake=true]:animate-shake"
      data-shake={!!wrong}
      style={{ aspectRatio: "4/3" }}
    >
      <img src={src} alt="scene" className="pointer-events-none absolute inset-0 h-full w-full object-cover" draggable={false} />
      {found.map((f) => (
        <span key={f.id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-success bg-success/20" style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: "12%", aspectRatio: "1" }} />
      ))}
      {hint && (
        <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-warning animate-ping-ring" style={{ left: `${hint.x * 100}%`, top: `${hint.y * 100}%`, width: "16%", aspectRatio: "1" }} />
      )}
      {wrong && (
        <span key={wrong.k} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-destructive animate-ping-ring" style={{ left: `${wrong.x * 100}%`, top: `${wrong.y * 100}%`, width: "12%", aspectRatio: "1" }} />
      )}
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
