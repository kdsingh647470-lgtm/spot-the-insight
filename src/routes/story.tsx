import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Lock, Star, Sparkles, Home as HomeIcon, Trophy, Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

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
    // Safety net: if the cleared level is the last of its tier, no
    // PathConnector renders between it and the next tier's first level,
    // so DuckDoneSignal never mounts and onCelebrationDone never fires.
    // Force-unlock the Play button after the same total celebration window
    // (~4.9s walk + 0.9s arrived chip) so progression never stalls.
    const fallbackTimer = window.setTimeout(() => {
      const id = pendingNextIdRef.current;
      if (!id) return;
      setArrivedNextId(id);
      window.setTimeout(() => {
        setArrivedNextId(null);
        setPendingNextId(null);
      }, 900);
    }, 4900);
    return () => {
      window.clearTimeout(panTimer);
      window.clearTimeout(clearTimer);
      window.clearTimeout(fallbackTimer);
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
// / Hard) and renders them in a compact grid.
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
  pendingNextId,
  arrivedNextId,
}: {
  worldLevels: LevelRow[];
  progress: Record<string, number>;
  unlocked: boolean;
  ring: string;
  chip: string;
  justClearedId: string | null;
  pendingNextId: string | null;
  arrivedNextId: string | null;
  onCelebrationDone: () => void;
}) {
  // Preserve the linear-unlock rule: previous level in the original ordering
  // must be cleared, regardless of which tier group it renders under.
  const clearedByIndex = worldLevels.map((lvl) => (progress[lvl.id] ?? 0) >= 1);

  // Compact grid layout: 4 tiles per row so a whole world fits on one or two
  // screens.
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

    const tiles: React.ReactNode[] = [];
    const flushTiles = (key: string) => {
      if (!tiles.length) return;
      nodes.push(
        <div key={key} className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-5">
          {tiles.splice(0, tiles.length)}
        </div>,
      );
    };

    for (const { lvl, idx } of tierLevels) {
      const stars = progress[lvl.id] ?? 0;
      const cleared = stars > 0;
      const prevCleared = idx === 0 || clearedByIndex[idx - 1];
      const canPlay = unlocked && prevCleared;
      const isPendingNext = pendingNextId === lvl.id;
      const isArrivedNext = arrivedNextId === lvl.id;
      const showPlay = canPlay && !isPendingNext;

      const tile = (
        <div
          className={`relative aspect-square overflow-hidden rounded-2xl ring-2 ${cleared ? ring : "ring-border"} bg-muted ${isPendingNext ? "animate-marker-pulse" : ""} ${showPlay ? "transition hover:brightness-110" : "opacity-70"}`}
        >
          {canPlay ? (
            <img src={lvl.image_a_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          ) : null}
          <div className={`absolute inset-0 ${canPlay ? "bg-gradient-to-t from-black/70 via-black/20 to-transparent" : "grid place-items-center"}`}>
            {!canPlay && !isPendingNext && <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          {isPendingNext && (
            <span className="absolute inset-0 grid place-items-center text-2xl">{isArrivedNext ? "🦆" : "🦆"}</span>
          )}
          {canPlay && (
            <div className="absolute inset-x-0 bottom-0 p-1 text-center">
              <div className="text-sm font-black leading-none text-white drop-shadow">{lvl.level_number}</div>
              <div className="mt-0.5 flex items-center justify-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <Star key={i} className={`h-2.5 w-2.5 ${i < stars ? "fill-warning text-warning" : "text-white/40"}`} />
                ))}
              </div>
            </div>
          )}
          {cleared && (
            <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-success text-success-foreground shadow">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          )}
        </div>
      );

      tiles.push(
        <div key={lvl.id} id={`lvl-${lvl.id}`} title={lvl.title}>
          {showPlay ? (
            <Link to="/play/$mode/$levelId" params={{ mode: "story", levelId: lvl.id }} className="block">
              {tile}
            </Link>
          ) : (
            <div aria-disabled>{tile}</div>
          )}
          <div className={`mt-1 truncate text-center text-[10px] font-semibold ${canPlay ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
            {lvl.title}
          </div>
      </div>,
    );
  }
  flushTiles(`grid-tail-${tier.key}`);
  }

  // `chip` is retained for theme parity with the world header.
  void chip;

  return <div className="relative">{nodes}</div>;
}



