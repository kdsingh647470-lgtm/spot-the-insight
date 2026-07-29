import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Lock, Star, Sparkles, Home as HomeIcon, Trophy, Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { AdSlot } from "@/components/AdSlot";
import { DuckWalk } from "@/components/story/DuckWalk";
import { getStoryMap, getMyStoryProgress } from "@/lib/levels.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "Story Map — Spot the Difference AI" },
      { name: "description", content: "Explore four themed worlds of hand-crafted spot-the-difference puzzles." },
      { property: "og:title", content: "Story Map — Spot the Difference AI" },
      { property: "og:description", content: "Cozy Home, Nature Escape, Adventure Quest, Future World." },
    ],
  }),
  component: StoryMap,
});

type WorldTheme = {
  world: number;
  name: string;
  tagline: string;
  gradient: string;
  chip: string;
  ring: string;
  icon: typeof HomeIcon;
};

const WORLDS: WorldTheme[] = [
  { world: 1, name: "Cozy Home",       tagline: "Warm rooms, quiet corners.", gradient: "from-amber-400 to-rose-400",     chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300",     ring: "ring-amber-500/40",  icon: HomeIcon },
  { world: 2, name: "Nature Escape",   tagline: "Forests, beaches, wild air.", gradient: "from-emerald-400 to-teal-500",   chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-500/40", icon: Sparkles },
  { world: 3, name: "Adventure Quest", tagline: "Ancient temples, hidden maps.", gradient: "from-orange-500 to-red-500", chip: "bg-orange-500/15 text-orange-600 dark:text-orange-300",  ring: "ring-orange-500/40", icon: Trophy },
  { world: 4, name: "Future World",    tagline: "Neon skylines, sleek machines.", gradient: "from-indigo-500 to-fuchsia-500", chip: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300", ring: "ring-indigo-500/40", icon: Sparkles },
];

type LevelRow = { id: string; world: number; level_number: number; title: string; difficulty: number; image_a_url: string };

function StoryMap() {
  const mapQ = useQuery({ queryKey: ["story-map"], queryFn: () => getStoryMap() });
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const progQ = useQuery({
    queryKey: ["story-progress"],
    queryFn: () => getMyStoryProgress(),
    enabled: hasSession,
  });
  const levels = (mapQ.data ?? []) as LevelRow[];

  // Guest progress: without a session, the server has no completions to return,
  // so the "next" level would stay locked forever after clearing one. Mirror
  // clears into localStorage and merge them into the progress map so the
  // linear-unlock rule still advances for signed-out players.
  const [guestProgress, setGuestProgress] = useState<Record<string, number>>({});
  useEffect(() => {
    // v2 key: the old "story-guest-progress" cache could contain entries
    // saved by a prior "skip to next" flow that treated skips as clears.
    // Drop that stale cache so uncleared levels stop appearing unlocked.
    try { localStorage.removeItem("story-guest-progress"); } catch {}
    try {
      const raw = localStorage.getItem("story-guest-progress-v2");
      if (raw) setGuestProgress(JSON.parse(raw));
    } catch {}
  }, []);
  const progress: Record<string, number> = { ...guestProgress, ...(progQ.data ?? {}) };

  // Read the "just cleared" flag once data is ready. This kicks off the full
  // post-level cinematic: camera pan from the cleared node to the next node,
  // duck walking the footprint trail, and a Play button that stays hidden
  // until the celebration finishes.
  const [justClearedId, setJustClearedId] = useState<string | null>(null);
  const [pendingNextId, setPendingNextId] = useState<string | null>(null);
  const [arrivedNextId, setArrivedNextId] = useState<string | null>(null);
  const panRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!levels.length) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem("story-just-cleared"); } catch {}
    if (!id) return;
    setJustClearedId(id);
    try { sessionStorage.removeItem("story-just-cleared"); } catch {}
    // Persist a guest-side clear so the next level unlocks even when signed out.
    setGuestProgress((prev) => {
      if ((prev[id!] ?? 0) >= 1) return prev;
      const next = { ...prev, [id!]: Math.max(1, prev[id!] ?? 0) };
      try { localStorage.setItem("story-guest-progress-v2", JSON.stringify(next)); } catch {}
      return next;
    });

    // Find the next level in the same world (linear order).
    const cleared = levels.find((l) => l.id === id);
    if (cleared) {
      const worldLvls = levels
        .filter((l) => l.world === cleared.world)
        .sort((a, b) => a.level_number - b.level_number);
      const idx = worldLvls.findIndex((l) => l.id === id);
      const next = idx >= 0 ? worldLvls[idx + 1] : null;
      if (next) setPendingNextId(next.id);
    }

    // Snap to the cleared node first so the trail is visible, then ease-scroll
    // toward the next node so the camera "follows" the duck up the map.
    const clearedEl = document.getElementById(`lvl-${id}`);
    clearedEl?.scrollIntoView({ behavior: "smooth", block: "center" });

    const panTimer = window.setTimeout(() => {
      const nextEl = pendingNextIdRef.current
        ? document.getElementById(`lvl-${pendingNextIdRef.current}`)
        : null;
      if (!nextEl) return;
      const targetRect = nextEl.getBoundingClientRect();
      const targetY = window.scrollY + targetRect.top - (window.innerHeight - targetRect.height) / 2;
      const startY = window.scrollY;
      const dur = 3800;
      const start = performance.now();
      const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        window.scrollTo(0, startY + (targetY - startY) * easeInOut(t));
        if (t < 1) panRafRef.current = requestAnimationFrame(tick);
      };
      panRafRef.current = requestAnimationFrame(tick);
    }, 600);

    const clearTimer = window.setTimeout(() => setJustClearedId(null), 5200);
    return () => {
      window.clearTimeout(panTimer);
      window.clearTimeout(clearTimer);
      if (panRafRef.current) cancelAnimationFrame(panRafRef.current);
    };
  }, [levels.length]);

  // Mirror pendingNextId into a ref so the setTimeout closure sees the latest
  // value after the state has flushed.
  const pendingNextIdRef = useRef<string | null>(null);
  useEffect(() => { pendingNextIdRef.current = pendingNextId; }, [pendingNextId]);

  // Group by world
  const byWorld = new Map<number, LevelRow[]>();
  for (const l of levels) {
    const arr = byWorld.get(l.world) ?? [];
    arr.push(l);
    byWorld.set(l.world, arr);
  }


  // World N unlocks when every level of World N-1 has ≥1 star (any completion).
  // World 1 always unlocked. Worlds with zero authored levels stay "Coming soon".
  const isWorldUnlocked = (world: number): boolean => {
    if (world === 1) return true;
    const prev = byWorld.get(world - 1) ?? [];
    if (!prev.length) return false;
    return prev.every((lvl) => (progress[lvl.id] ?? 0) >= 1);
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Story Mode</p>
            <h1 className="mt-1 text-3xl font-black leading-tight">World Map</h1>
            <p className="mt-1 text-sm text-muted-foreground">Clear every level in a world to unlock the next one.</p>
          </div>
        </div>

        {mapQ.isLoading && <p className="text-sm text-muted-foreground">Loading map…</p>}

        <div className="space-y-5">
          {WORLDS.map((w) => {
            const worldLevels = (byWorld.get(w.world) ?? []).sort((a, b) => a.level_number - b.level_number);
            const unlocked = isWorldUnlocked(w.world);
            const totalStars = worldLevels.reduce((s, l) => s + (progress[l.id] ?? 0), 0);
            const maxStars = worldLevels.length * 3;
            return (
              <section key={w.world} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                <header className={`relative flex items-center gap-3 bg-gradient-to-br ${w.gradient} p-4 text-white`}>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/25 backdrop-blur">
                    <w.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">World {w.world}</div>
                    <h2 className="truncate text-lg font-black leading-tight">{w.name}</h2>
                    <p className="truncate text-xs opacity-90">{w.tagline}</p>
                  </div>
                  {worldLevels.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-xs font-bold backdrop-blur">
                      <Star className="h-3.5 w-3.5 fill-current" /> {totalStars}/{maxStars}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold backdrop-blur">Coming soon</span>
                  )}
                  {!unlocked && worldLevels.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-xs font-bold backdrop-blur">
                      <Lock className="h-3.5 w-3.5" /> Locked
                    </span>
                  )}
                </header>

                {worldLevels.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    New levels arriving soon.
                  </div>
                ) : (
                  <LevelList
                    worldLevels={worldLevels}
                    progress={progress}
                    unlocked={unlocked}
                    ring={w.ring}
                    chip={w.chip}
                    justClearedId={justClearedId}
                    pendingNextId={pendingNextId}
                    arrivedNextId={arrivedNextId}
                    onCelebrationDone={() => {
                      const id = pendingNextIdRef.current;
                      if (id) setArrivedNextId(id);
                      window.setTimeout(() => {
                        setArrivedNextId(null);
                        setPendingNextId(null);
                      }, 900);
                    }}
                  />

                )}
              </section>
            );
          })}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LevelList: groups a world's levels by difficulty tier (Easy / Intermediate
// / Hard) and injects an AdSlot after every 2 rendered level cards.
// ---------------------------------------------------------------------------

const TIERS: { key: string; label: string; min: number; max: number; badge: string }[] = [
  { key: "easy",         label: "Easy",         min: 1, max: 2, badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  { key: "intermediate", label: "Intermediate", min: 3, max: 4, badge: "bg-amber-500/15  text-amber-600  dark:text-amber-300" },
  { key: "hard",         label: "Hard",         min: 5, max: 6, badge: "bg-rose-500/15   text-rose-600   dark:text-rose-300" },
];

function LevelList({
  worldLevels,
  progress,
  unlocked,
  ring,
  chip,
  justClearedId,
  pendingNextId,
  onCelebrationDone,
}: {
  worldLevels: LevelRow[];
  progress: Record<string, number>;
  unlocked: boolean;
  ring: string;
  chip: string;
  justClearedId: string | null;
  pendingNextId: string | null;
  onCelebrationDone: () => void;
}) {
  // Preserve the linear-unlock rule: previous level in the original ordering
  // must be cleared, regardless of which tier group it renders under.
  const clearedByIndex = worldLevels.map((lvl) => (progress[lvl.id] ?? 0) >= 1);

  // Track how many level cards we've rendered across all tiers so a single
  // ad rhythm (one ad after every 2 levels) spans the whole world.
  let rendered = 0;
  let prevLvlId: string | null = null;
  const nodes: React.ReactNode[] = [];

  for (const tier of TIERS) {
    const tierLevels = worldLevels
      .map((lvl, idx) => ({ lvl, idx }))
      .filter(({ lvl }) => lvl.difficulty >= tier.min && lvl.difficulty <= tier.max);
    if (!tierLevels.length) continue;

    nodes.push(
      <div key={`hdr-${tier.key}`} className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-2 first:border-t-0">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${tier.badge}`}>
          {tier.label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {tierLevels.length} level{tierLevels.length === 1 ? "" : "s"}
        </span>
      </div>,
    );

    let tierPos = 0;
    for (const { lvl, idx } of tierLevels) {
      const stars = progress[lvl.id] ?? 0;
      const cleared = stars > 0;
      const prevCleared = idx === 0 || clearedByIndex[idx - 1];
      const canPlay = unlocked && prevCleared;
      const isPendingNext = pendingNextId === lvl.id;
      const showPlay = canPlay && !isPendingNext;
      if (tierPos > 0) {
        const spotlight = !!justClearedId && prevLvlId === justClearedId;
        const celebrating = spotlight && !!pendingNextId;
        nodes.push(
          <PathConnector
            key={`path-${lvl.id}`}
            active={prevCleared}
            direction={tierPos % 2 === 0 ? "right" : "left"}
            spotlight={spotlight}
            celebrating={celebrating}
            onFinished={spotlight ? onCelebrationDone : undefined}
          />,
        );
      }
      tierPos++;
      prevLvlId = lvl.id;
      const body = (
        <div className="flex items-center gap-3 p-3">
          <div className={`relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl ring-2 ${cleared ? ring : "ring-border"} bg-muted ${isPendingNext ? "animate-marker-pulse" : ""}`}>
            {canPlay ? (
              <img src={lvl.image_a_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
            {cleared && (
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-success text-success-foreground shadow">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-[10px] font-bold uppercase tracking-widest ${canPlay ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
              Level {lvl.level_number}
            </div>
            <div className={`truncate text-base font-black ${canPlay ? "" : "text-muted-foreground"}`}>{lvl.title}</div>
            <div className="mt-1 flex items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
              ))}
            </div>
          </div>
          {showPlay ? (
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${chip} animate-fade-in`}>
              {cleared ? "Replay" : "Play"}
            </span>
          ) : isPendingNext ? (
            <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              Duck on the way…
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              Locked
            </span>
          )}
        </div>
      );
      nodes.push(
        <div key={lvl.id} id={`lvl-${lvl.id}`} className="border-t border-border first:border-t-0">
          {showPlay ? (
            <Link to="/play/$mode/$levelId" params={{ mode: "story", levelId: lvl.id }} className="block transition hover:bg-muted/50">
              {body}
            </Link>
          ) : (
            <div aria-disabled className="opacity-70">{body}</div>
          )}
        </div>,
      );
      rendered++;
      if (rendered % 2 === 0) {
        nodes.push(<AdSlot key={`ad-${lvl.id}`} />);
      }
    }
  }

  return <div className="relative">{nodes}</div>;
}

// Footprint trail between two consecutive levels. When `active` (previous
// level cleared), footprints appear one-by-one along a curved path. When
// `spotlight` is true (the user just cleared the level above), a duck holding
// a magnifying glass walks along the same curve for ~3s.
function PathConnector({
  active,
  direction,
  spotlight = false,
  celebrating = false,
  onFinished,
}: {
  active: boolean;
  direction: "left" | "right";
  spotlight?: boolean;
  celebrating?: boolean;
  onFinished?: () => void;
}) {
  // Vertical path — duck walks from the previous (top) level DOWN to the
  // next (bottom) level, matching the top-to-bottom list layout. The
  // control point offsets sideways so the trail gently curves left/right
  // between rows instead of being a straight line.
  const p0 = { x: 48, y: 8 };
  const p2 = { x: 48, y: 152 };
  const p1 = { x: direction === "right" ? 82 : 14, y: 80 };

  const STEPS = 9;
  const points = Array.from({ length: STEPS }, (_, i) => {
    const t = (i + 0.5) / STEPS;
    const mt = 1 - t;
    const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
    const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
    const dx = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x, y, angle, side: i % 2 === 0 ? -1 : 1 };
  });

  return (
    <div aria-hidden className={`relative mx-auto w-24 overflow-hidden ${spotlight ? "h-48" : "h-32"}`}>
      <div className={`absolute inset-0 ${active || spotlight ? "bg-gradient-to-b from-sky-100/60 via-sky-50/20 to-transparent dark:from-sky-500/10" : ""}`} />

      {/* Ambient life during spotlight — butterflies, pollen motes. */}
      {spotlight && (
        <>
          <span className="pointer-events-none absolute left-[6%] top-[24%] text-lg animate-butterfly" style={{ animationDelay: "0.3s" }}>🦋</span>
          <span className="pointer-events-none absolute right-[8%] top-[62%] text-base animate-butterfly" style={{ animationDelay: "1.4s", animationDuration: "7s" }}>🦋</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-warning/70"
              style={{
                left: `${18 + i * 12}%`,
                bottom: "10%",
                animation: `pollen-float ${3 + i * 0.4}s ease-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </>
      )}

      <svg viewBox="0 0 96 160" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        {points.map((pt, i) => {
          const rad = (pt.angle * Math.PI) / 180;
          const nx = -Math.sin(rad) * 5 * pt.side;
          const ny =  Math.cos(rad) * 5 * pt.side;
          const rot = pt.angle + (pt.side > 0 ? 12 : -12);
          const showPrint = active || spotlight;
          return (
            <g
              key={i}
              transform={`translate(${pt.x + nx} ${pt.y + ny}) rotate(${rot})`}
              className={showPrint ? "animate-footprint" : ""}
              style={showPrint ? { animationDelay: `${i * 220}ms`, opacity: 0 } : undefined}
            >
              {showPrint ? (
                <>
                  <ellipse rx="2.6" ry="3.4" cy="1.2" className="fill-primary" />
                  <circle r="1" cx="-1.8" cy="-2.8" className="fill-primary" />
                  <circle r="0.8" cx="-0.5" cy="-3.7" className="fill-primary" />
                  <circle r="0.8" cx="0.8" cy="-3.7" className="fill-primary" />
                  <circle r="0.8" cx="2"    cy="-2.9" className="fill-primary" />
                </>
              ) : (
                <circle r="1.3" className="fill-muted-foreground/30" />
              )}
            </g>
          );
        })}

        {spotlight && <DuckWalk p0={p0} p1={p1} p2={p2} />}
      </svg>

      {celebrating && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary-foreground shadow animate-fade-in">
          Duck arriving…
        </span>
      )}
      {spotlight && !celebrating && (
        // Fires the finished callback once celebration ends — kept out of the
        // SVG tree so DuckWalk's own timing drives when Play appears.
        <DuckDoneSignal onFinished={onFinished} />
      )}
    </div>
  );
}

function DuckDoneSignal({ onFinished }: { onFinished?: () => void }) {
  useEffect(() => {
    if (!onFinished) return;
    // DuckWalk default = 3800ms walk + ~1050ms celebration ≈ 4900ms.
    const t = window.setTimeout(() => onFinished(), 4900);
    return () => window.clearTimeout(t);
  }, [onFinished]);
  return null;
}


