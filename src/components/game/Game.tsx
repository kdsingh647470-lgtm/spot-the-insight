import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Heart, Lightbulb, Pause, Play, Timer, X, RotateCcw, Home, Star, Coins, Sparkles, Infinity as InfinityIcon, Leaf, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getLevelById, submitCompletion, spendHint, getRandomLevel, getDailyLevel, getDailyStatus } from "@/lib/levels.functions";

type Mode = "story" | "daily" | "infinite" | "timed" | "relax";
type Diff = { id: string; x: number; y: number; radius: number; label: string | null };
type Found = { id: string; x: number; y: number };

const TAP_TOLERANCE = 0.06;

type ModeConfig = {
  label: string;
  icon: typeof Timer;
  startingLives: number | null;   // null = unlimited
  livesPersist: boolean;          // carry lives across levels
  timer: "up" | "down" | "off";
  startingTime: number;           // seconds; used for "down"
  timePersist: boolean;           // countdown persists across levels
  timeBonusOnWin: number;         // seconds added on level clear (timed)
  freeHints: boolean;
  autoAdvance: boolean;           // relax: auto next after short pause
  allowNext: boolean;             // daily: no next-level button
  scorePersist: boolean;          // carry score across levels
};

const MODE_CONFIG: Record<Mode, ModeConfig> = {
  story:    { label: "Story",    icon: Sparkles,     startingLives: 3,    livesPersist: false, timer: "up",   startingTime: 0,  timePersist: false, timeBonusOnWin: 0,  freeHints: false, autoAdvance: false, allowNext: true,  scorePersist: false },
  daily:    { label: "Daily",    icon: Calendar,     startingLives: 3,    livesPersist: false, timer: "up",   startingTime: 0,  timePersist: false, timeBonusOnWin: 0,  freeHints: false, autoAdvance: false, allowNext: false, scorePersist: false },
  infinite: { label: "Infinite", icon: InfinityIcon, startingLives: 3,    livesPersist: true,  timer: "up",   startingTime: 0,  timePersist: false, timeBonusOnWin: 0,  freeHints: false, autoAdvance: true,  allowNext: true,  scorePersist: true  },
  timed:    { label: "Timed",    icon: Timer,        startingLives: null, livesPersist: false, timer: "down", startingTime: 90, timePersist: true,  timeBonusOnWin: 15, freeHints: false, autoAdvance: true,  allowNext: true,  scorePersist: true  },
  relax:    { label: "Relax",    icon: Leaf,         startingLives: null, livesPersist: false, timer: "off",  startingTime: 0,  timePersist: false, timeBonusOnWin: 0,  freeHints: true,  autoAdvance: true,  allowNext: true,  scorePersist: false },
};

export function Game({ mode, levelId: initialLevelId }: { mode: Mode; levelId?: string }) {
  const navigate = useNavigate();
  const cfg = MODE_CONFIG[mode];
  const [levelId, setLevelId] = useState<string | null>(initialLevelId ?? null);
  const [loadingPick, setLoadingPick] = useState(!initialLevelId);

  // Persistent run state across levels (for infinite / timed)
  const [runLives, setRunLives] = useState<number | null>(cfg.startingLives);
  const [runTime, setRunTime] = useState<number>(cfg.startingTime);   // seconds remaining for down; ignored for up
  const [runScore, setRunScore] = useState(0);
  const [runLevels, setRunLevels] = useState(0);
  const [runOver, setRunOver] = useState<null | "lives" | "time">(null);

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

  async function pickNext() {
    const id = mode === "daily" ? await getDailyLevel() : await getRandomLevel();
    if (id) setLevelId(id);
  }

  function resetRun() {
    setRunLives(cfg.startingLives);
    setRunTime(cfg.startingTime);
    setRunScore(0);
    setRunLevels(0);
    setRunOver(null);
  }

  // Daily: block replay if already completed today for this signed-in user.
  const dailyStatusQ = useQuery({
    queryKey: ["daily-status"],
    queryFn: () => getDailyStatus(),
    enabled: mode === "daily",
    retry: false,
  });
  if (mode === "daily" && dailyStatusQ.data?.completion) {
    const c = dailyStatusQ.data.completion;
    return <DailyDone timeMs={c.time_ms} stars={c.stars} date={dailyStatusQ.data.date} onHome={() => navigate({ to: "/" })} />;
  }

  if (runOver) {
    return <RunOver reason={runOver} score={runScore} levels={runLevels} onRetry={() => { resetRun(); pickNext(); }} onHome={() => navigate({ to: "/" })} />;
  }
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
  return (
    <GameInner
      key={levelId}
      mode={mode}
      cfg={cfg}
      data={lvlQ.data}
      run={{ lives: runLives, timeRemaining: runTime, score: runScore, levels: runLevels }}
      onLevelClear={({ scoreDelta, remainingTime }) => {
        if (cfg.scorePersist) setRunScore((s) => s + scoreDelta);
        if (cfg.livesPersist) { /* keep runLives as-is (updated on mistakes) */ }
        if (cfg.timePersist) setRunTime(Math.max(0, remainingTime + cfg.timeBonusOnWin));
        setRunLevels((n) => n + 1);
      }}
      onLivesChange={(l) => { if (cfg.livesPersist) setRunLives(l); }}
      onOutOfLives={() => setRunOver("lives")}
      onOutOfTime={() => setRunOver("time")}
      onNext={pickNext}
    />
  );
}

function GameInner({
  mode, cfg, data, run, onLevelClear, onLivesChange, onOutOfLives, onOutOfTime, onNext,
}: {
  mode: Mode;
  cfg: ModeConfig;
  data: { id: string; title: string; image_a_url: string; image_b_url: string; differences: Diff[] };
  run: { lives: number | null; timeRemaining: number; score: number; levels: number };
  onLevelClear: (r: { scoreDelta: number; remainingTime: number }) => void;
  onLivesChange: (lives: number) => void;
  onOutOfLives: () => void;
  onOutOfTime: () => void;
  onNext: () => void;
}) {
  const navigate = useNavigate();
  const totalDiffs = data.differences.length || 5;
  const [found, setFound] = useState<Found[]>([]);
  const [lives, setLives] = useState<number | null>(run.lives);
  const [hints, setHints] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);              // seconds since level start
  const [timeLeft, setTimeLeft] = useState(run.timeRemaining); // seconds remaining (timed)
  const [wrong, setWrong] = useState<{ x: number; y: number; k: number } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [hintTarget, setHintTarget] = useState<Diff | null>(null);
  const [showResult, setShowResult] = useState<null | "win" | "lose">(null);
  const [levelScore, setLevelScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [comboPop, setComboPop] = useState<{ n: number; gain: number; k: number } | null>(null);
  const [session, setSession] = useState<any>(null);
  const startRef = useRef(Date.now());

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSession(data.session)); }, []);

  // Timer tick
  useEffect(() => {
    if (paused || showResult || cfg.timer === "off") return;
    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(secs);
      if (cfg.timer === "down") {
        const remaining = Math.max(0, run.timeRemaining - secs);
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(t);
          setShowResult("lose");
          onOutOfTime();
        }
      }
    }, 250);
    return () => clearInterval(t);
  }, [paused, showResult, cfg.timer, run.timeRemaining, onOutOfTime]);

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
      const newCombo = combo + 1;
      const multiplier = Math.min(newCombo, 5);
      const gain = 100 * multiplier;
      setCombo(newCombo);
      setBestCombo((b) => Math.max(b, newCombo));
      setLevelScore((s) => s + gain);
      setComboPop({ n: newCombo, gain, k: Date.now() });
      if (newCombo >= 2) playBeep(1100 + newCombo * 60, 0.08, "triangle");
      if (nf.length >= totalDiffs) {
        const timeUsed = Math.floor((Date.now() - startRef.current) / 1000);
        const remainingTime = cfg.timer === "down" ? Math.max(0, run.timeRemaining - timeUsed) : 0;
        setShowResult("win");
        onLevelClear({ scoreDelta: levelScore + gain, remainingTime });
        void (async () => {
          if (session) {
            try {
              const r = await submitMut.mutateAsync({ data: { level_id: data.id, time_ms: (Date.now() - startRef.current), hints_used: hints, mistakes, mode: mode === "story" ? "story" : mode } });
              setLevelScore((s) => s + r.coinsEarned);
            } catch {}
          }
        })();
        if (cfg.autoAdvance) {
          setTimeout(() => { onNext(); }, 1400);
        }
      }
    } else {
      playBeep(180, 0.15, "square");
      setWrong({ x: px, y: py, k: Date.now() });
      setShakeKey((k) => k + 1);
      setMistakes((m) => m + 1);
      setCombo(0);
      setComboPop(null);
      if (lives != null) {
        const nl = lives - 1;
        setLives(nl);
        onLivesChange(nl);
        if (nl <= 0) {
          setShowResult("lose");
          onOutOfLives();
        }
      }
    }
  }

  async function useHint() {
    const remaining = data.differences.filter((d) => !found.some((f) => f.id === d.id));
    if (!remaining.length) return;
    if (!cfg.freeHints && session) {
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
    setFound([]); setLives(cfg.startingLives); setHints(0); setMistakes(0); setElapsed(0);
    setTimeLeft(cfg.startingTime); setLevelScore(0);
    setCombo(0); setBestCombo(0); setComboPop(null);
    setShowResult(null); startRef.current = Date.now();
  }

  const stars = mistakes === 0 && hints === 0 ? 3 : mistakes <= 1 ? 2 : 1;
  const totalScore = (cfg.scorePersist ? run.score : 0) + levelScore;
  const ModeIcon = cfg.icon;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* HUD */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-background/80 px-3 py-2 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })} aria-label="Home"><Home className="h-5 w-5" /></Button>
        <div className="flex min-w-0 items-center gap-1">
          {lives == null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
              <ModeIcon className="h-3.5 w-3.5" /> {cfg.label}
            </span>
          ) : (
            Array.from({ length: cfg.startingLives ?? 0 }).map((_, i) => (
              <Heart key={i} className={`h-5 w-5 ${i < lives ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`} />
            ))
          )}
        </div>
        {cfg.timer !== "off" ? (
          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${cfg.timer === "down" && timeLeft <= 10 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted"}`}>
            <Timer className="h-4 w-4" /> {formatTime(cfg.timer === "down" ? timeLeft : elapsed)}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-success">
            <Leaf className="h-4 w-4" /> Relax
          </div>
        )}
        <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          <Sparkles className="h-4 w-4" /> {found.length}/{totalDiffs}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setPaused(true)} aria-label="Pause"><Pause className="h-5 w-5" /></Button>
      </div>

      <div className="relative flex flex-1 flex-col gap-3 p-3 md:flex-row md:items-stretch">
        <GameImage src={data.image_a_url} onTap={handleTap} found={found} wrong={wrong} hint={hintTarget} shakeKey={shakeKey} />
        <GameImage src={data.image_b_url} onTap={handleTap} found={found} wrong={wrong} hint={hintTarget} shakeKey={shakeKey} />
        <AnimatePresence>
          {comboPop && comboPop.n >= 2 && (
            <motion.div
              key={comboPop.k}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-warning px-4 py-1.5 text-sm font-black text-warning-foreground shadow-elevated"
            >
              {comboPop.n}× COMBO · +{comboPop.gain}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-background/80 px-3 py-3 backdrop-blur">
        <Button variant="secondary" onClick={useHint}>
          <Lightbulb className="mr-1 h-4 w-4" /> Hint {cfg.freeHints ? "" : "(25)"}
        </Button>
        <div className="flex items-center gap-2 text-sm font-bold tabular-nums">
          {combo >= 2 && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-warning">×{Math.min(combo, 5)}</span>
          )}
          <span>Score {totalScore}</span>
          {cfg.scorePersist && run.levels > 0 && (
            <span className="text-muted-foreground">· Lv {run.levels + 1}</span>
          )}
        </div>
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
              <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                <Stat label="Time" value={formatTime(Math.floor((Date.now() - startRef.current) / 1000))} />
                <Stat label="Mistakes" value={String(mistakes)} />
                <Stat label="Hints" value={String(hints)} />
                <Stat label="Best combo" value={`×${bestCombo}`} />
              </div>
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 font-bold text-warning">
                <Coins className="h-4 w-4" /> +{levelScore}
              </div>
              {cfg.timer === "down" && cfg.timeBonusOnWin > 0 && (
                <p className="mt-2 text-sm font-bold text-success">+{cfg.timeBonusOnWin}s bonus time!</p>
              )}
              <div className="mt-5 flex gap-2">
                {cfg.allowNext ? (
                  <Button className="flex-1" onClick={() => { onNext(); }}>{cfg.autoAdvance ? "Next now" : "Next level"}</Button>
                ) : (
                  <Button className="flex-1" onClick={() => navigate({ to: "/" })}>Done</Button>
                )}
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
              <h2 className="mt-3 text-2xl font-black">Out of {cfg.timer === "down" ? "time" : "lives"}</h2>
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

function DailyDone({ timeMs, stars, date, onHome }: { timeMs: number; stars: number; date: string; onHome: () => void }) {
  const secs = Math.floor(timeMs / 1000);
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-elevated">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
          <Calendar className="h-8 w-8" />
        </div>
        <h2 className="mt-3 text-2xl font-black">Daily challenge done!</h2>
        <p className="mt-1 text-sm text-muted-foreground">You already cleared today's challenge ({date} UTC). Come back tomorrow for a new one.</p>
        <div className="mt-3 flex justify-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Star key={i} className={`h-7 w-7 ${i < stars ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-bold tabular-nums">
          <Timer className="h-4 w-4" /> {Math.floor(secs / 60)}:{(secs % 60).toString().padStart(2, "0")}
        </div>
        <div className="mt-5"><Button className="w-full" onClick={onHome}>Home</Button></div>
      </div>
    </div>
  );
}

function RunOver({ reason, score, levels, onRetry, onHome }: { reason: "lives" | "time"; score: number; levels: number; onRetry: () => void; onHome: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-elevated">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-destructive">
          <X className="h-8 w-8" />
        </div>
        <h2 className="mt-3 text-2xl font-black">Run over</h2>
        <p className="mt-1 text-sm text-muted-foreground">Out of {reason}.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Levels cleared" value={String(levels)} />
          <Stat label="Total score" value={String(score)} />
        </div>
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" onClick={onRetry}><RotateCcw className="mr-1 h-4 w-4" /> New run</Button>
          <Button variant="secondary" onClick={onHome}>Home</Button>
        </div>
      </div>
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
