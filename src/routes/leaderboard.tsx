import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Crown, Globe, CalendarDays, CalendarRange, Sunrise } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { getLeaderboard } from "@/lib/levels.functions";

type Scope = "global" | "weekly" | "monthly" | "daily";

const TABS: Array<{ id: Scope; label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }> = [
  { id: "global", label: "Global", icon: Globe, blurb: "All-time XP" },
  { id: "weekly", label: "Weekly", icon: CalendarRange, blurb: "XP earned in the last 7 days" },
  { id: "monthly", label: "Monthly", icon: CalendarDays, blurb: "XP earned in the last 30 days" },
  { id: "daily", label: "Daily", icon: Sunrise, blurb: "XP earned today (UTC)" },
];

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Spot the Difference AI" },
      { name: "description", content: "See the top spot-the-difference players ranked by XP across global, weekly, monthly, and daily boards." },
      { property: "og:title", content: "Leaderboard — Spot the Difference AI" },
      { property: "og:description", content: "Top players across global, weekly, monthly, and daily leaderboards." },
      { property: "og:url", content: "/leaderboard" },
    ],
    links: [{ rel: "canonical", href: "https://spot-the-insight.lovable.app/leaderboard" }],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const [scope, setScope] = useState<Scope>("global");
  const q = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: () => getLeaderboard({ data: { scope } }),
  });
  const tab = TABS.find((t) => t.id === scope)!;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="h-6 w-6 text-warning" />
          <h1 className="text-2xl font-black">Leaderboard</h1>
        </div>

        <div className="mb-3 flex gap-1.5 overflow-x-auto rounded-full border border-border bg-card p-1 shadow-soft">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === scope;
            return (
              <button
                key={t.id}
                onClick={() => setScope(t.id)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-elevated"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{tab.blurb}</p>

        {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
        <ol className="space-y-2">
          {q.data?.map((row, i) => (
            <li key={row.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${i === 0 ? "bg-warning text-warning-foreground" : i === 1 ? "bg-secondary text-secondary-foreground" : i === 2 ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{row.username ?? "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">Level {row.level}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                <Trophy className="h-3.5 w-3.5" /> {row.score} {row.scoreLabel}
              </span>
            </li>
          ))}
          {!q.isLoading && q.data?.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground">
              No entries in this window yet — play a level to appear here!
            </p>
          )}
        </ol>
      </main>
    </div>
  );
}
