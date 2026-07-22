import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { getMyProfile, claimDaily, setPremium } from "@/lib/profile.functions";
import { makeMeAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Coins, Star, Sparkles, Gift, Flame, ShieldCheck, Lock, Trophy, Zap, Target, Award, Crown, Medal, BarChart3, Clock, TrendingUp, MousePointerClick } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const router = useRouter();
  const q = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });
  const claim = useMutation({
    mutationFn: () => claimDaily(),
    onSuccess: (r) => { toast.success(`+${r.reward} coins · ${r.streak} day streak!`); q.refetch(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const promote = useMutation({
    mutationFn: () => makeMeAdmin(),
    onSuccess: () => { toast.success("You're now admin!"); q.refetch(); router.invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const prem = useMutation({
    mutationFn: (enabled: boolean) => setPremium({ data: { enabled } }),
    onSuccess: () => q.refetch(),
  });

  if (q.isLoading || !q.data) return <div className="min-h-dvh bg-background"><AppHeader /><p className="p-6">Loading…</p></div>;
  const { profile, achievements, isAdmin, stats } = q.data;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <section className="rounded-3xl bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-elevated">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Player</p>
          <h1 className="mt-1 text-3xl font-black">{profile?.username ?? "You"}</h1>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <BigStat icon={<Coins className="h-4 w-4" />} label="Coins" value={profile?.coins ?? 0} />
            <BigStat icon={<Sparkles className="h-4 w-4" />} label="XP" value={profile?.xp ?? 0} />
            <BigStat icon={<Star className="h-4 w-4" />} label="Level" value={profile?.level ?? 1} />
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-warning" /><h2 className="font-bold">Daily reward</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Come back every day for bonus coins.</p>
          <Button className="mt-3" onClick={() => claim.mutate()} disabled={claim.isPending}><Flame className="mr-1 h-4 w-4" /> Claim today's reward</Button>
        </section>

        <StatsSection stats={stats} />

        <AchievementsSection achievements={achievements} />



        <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Premium (placeholder)</h2>
              <p className="text-sm text-muted-foreground">Remove ads and unlock cosmetics.</p>
            </div>
            <Switch aria-label="Toggle premium" checked={profile?.is_premium ?? false} onCheckedChange={(v) => prem.mutate(v)} />
          </div>
        </section>

        {!isAdmin && (
          <section className="rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-bold">Become the first admin</h2></div>
            <p className="mt-1 text-sm text-muted-foreground">If no admin exists yet, you can claim it here to create levels.</p>
            <Button className="mt-3" variant="secondary" onClick={() => promote.mutate()} disabled={promote.isPending}>Make me admin</Button>
          </section>
        )}
      </main>
    </div>
  );
}

function BigStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/10 p-3 backdrop-blur">
      <div className="flex items-center gap-1 text-xs opacity-80">{icon} {label}</div>
      <div className="text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

type Stats = {
  totalPlays: number;
  uniqueLevels: number;
  totalStars: number;
  perfect: number;
  accuracy: number;
  avgTimeMs: number;
  bestTimeMs: number;
  totalHints: number;
  totalMistakes: number;
  currentStreak: number;
  lastClaimDate: string | null;
  byWorld: Record<number, number>;
  byMode: Record<string, number>;
};

const WORLD_NAMES: Record<number, string> = { 1: "Cozy Home", 2: "Nature Escape", 3: "Adventure Quest", 4: "Future World" };
const MODE_NAMES: Record<string, string> = { story: "Story", daily: "Daily", infinite: "Infinite", timed: "Timed", relax: "Relax" };

function fmtTime(ms: number) {
  if (!ms) return "—";
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function StatsSection({ stats }: { stats: Stats }) {
  const tiles: Array<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = [
    { icon: <Target className="h-4 w-4" />, label: "Accuracy", value: `${stats.accuracy}%`, sub: `${stats.totalMistakes} misses` },
    { icon: <Clock className="h-4 w-4" />, label: "Avg time", value: fmtTime(stats.avgTimeMs), sub: `best ${fmtTime(stats.bestTimeMs)}` },
    { icon: <BarChart3 className="h-4 w-4" />, label: "Levels cleared", value: `${stats.uniqueLevels}`, sub: `${stats.totalPlays} plays` },
    { icon: <Star className="h-4 w-4" />, label: "Total stars", value: `${stats.totalStars}`, sub: `${stats.perfect} perfect` },
    { icon: <MousePointerClick className="h-4 w-4" />, label: "Hints used", value: `${stats.totalHints}` },
    { icon: <Flame className="h-4 w-4" />, label: "Daily streak", value: `${stats.currentStreak}d` },
  ];
  const worldEntries = Object.entries(stats.byWorld).sort(([a], [b]) => Number(a) - Number(b));
  const modeEntries = Object.entries(stats.byMode).sort(([, a], [, b]) => b - a);

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Statistics</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border/60 bg-muted/40 p-3">
            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.icon} {t.label}
            </div>
            <div className="mt-1 text-xl font-black tabular-nums">{t.value}</div>
            {t.sub && <div className="text-[10px] text-muted-foreground">{t.sub}</div>}
          </div>
        ))}
      </div>
      {worldEntries.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">By world</p>
          <div className="flex flex-wrap gap-1.5">
            {worldEntries.map(([w, n]) => (
              <span key={w} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {WORLD_NAMES[Number(w)] ?? `World ${w}`} · {n}
              </span>
            ))}
          </div>
        </div>
      )}
      {modeEntries.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">By mode</p>
          <div className="flex flex-wrap gap-1.5">
            {modeEntries.map(([m, n]) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-xs font-semibold text-accent-foreground">
                {MODE_NAMES[m] ?? m} · {n}
              </span>
            ))}
          </div>
        </div>
      )}
      {stats.totalPlays === 0 && (
        <p className="mt-3 text-center text-sm text-muted-foreground">Play a level to start tracking stats.</p>
      )}
    </section>
  );
}

type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  coin_reward: number;
  xp_reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy, star: Star, zap: Zap, flame: Flame, target: Target,
  award: Award, crown: Crown, medal: Medal, sparkles: Sparkles, coins: Coins,
};

function AchievementsSection({ achievements }: { achievements: Achievement[] }) {
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked && b.unlocked) {
      return (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? "");
    }
    return a.title.localeCompare(b.title);
  });
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const pct = total ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h2 className="font-bold">Achievements</h2>
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {unlockedCount}/{total}
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-warning to-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sorted.map((a) => {
          const Icon = (a.icon && ICON_MAP[a.icon]) || Trophy;
          return (
            <div
              key={a.id}
              className={`relative overflow-hidden rounded-2xl border p-3 text-center transition ${
                a.unlocked
                  ? "border-warning/50 bg-gradient-to-br from-warning/15 to-primary/10 shadow-soft"
                  : "border-border bg-muted/40"
              }`}
            >
              <div
                className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${
                  a.unlocked
                    ? "bg-gradient-to-br from-warning to-primary text-primary-foreground shadow-elevated"
                    : "bg-background"
                }`}
              >
                {a.unlocked ? (
                  <Icon className="h-6 w-6" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p
                className={`mt-2 truncate text-xs font-bold ${
                  a.unlocked ? "" : "text-muted-foreground"
                }`}
              >
                {a.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                {a.description}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold">
                {a.coin_reward > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/20 px-1.5 py-0.5 text-warning">
                    <Coins className="h-2.5 w-2.5" />{a.coin_reward}
                  </span>
                )}
                {a.xp_reward > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-primary">
                    <Sparkles className="h-2.5 w-2.5" />{a.xp_reward}
                  </span>
                )}
              </div>
              {a.unlocked && a.unlocked_at && (
                <p className="mt-1 text-[9px] text-muted-foreground">
                  {new Date(a.unlocked_at).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
            No achievements yet — play a level to start unlocking!
          </p>
        )}
      </div>
    </section>
  );
}
