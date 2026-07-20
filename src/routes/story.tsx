import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Lock, Star, Sparkles, Home as HomeIcon, Trophy, Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
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
  const progress = progQ.data ?? {};
  const levels = (mapQ.data ?? []) as LevelRow[];

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
                  <ol className="relative divide-y divide-border">
                    {worldLevels.map((lvl, idx) => {
                      const stars = progress[lvl.id] ?? 0;
                      const cleared = stars > 0;
                      // Level unlocks: world unlocked AND (first level OR previous level cleared).
                      const prevCleared = idx === 0 || (progress[worldLevels[idx - 1].id] ?? 0) >= 1;
                      const canPlay = unlocked && prevCleared;
                      const body = (
                        <div className="flex items-center gap-3 p-3">
                          <div className={`relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl ring-2 ${cleared ? w.ring : "ring-border"} bg-muted`}>
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
                              Level {lvl.level_number} · Difficulty {lvl.difficulty}
                            </div>
                            <div className={`truncate text-base font-black ${canPlay ? "" : "text-muted-foreground"}`}>{lvl.title}</div>
                            <div className="mt-1 flex items-center gap-0.5">
                              {[0, 1, 2].map((i) => (
                                <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${canPlay ? w.chip : "bg-muted text-muted-foreground"}`}>
                            {canPlay ? (cleared ? "Replay" : "Play") : "Locked"}
                          </span>
                        </div>
                      );
                      return (
                        <li key={lvl.id}>
                          {canPlay ? (
                            <Link
                              to="/play/$mode/$levelId"
                              params={{ mode: "story", levelId: lvl.id }}
                              className="block transition hover:bg-muted/50"
                            >
                              {body}
                            </Link>
                          ) : (
                            <div aria-disabled className="opacity-70">{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
