import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { getLeaderboard } from "@/lib/levels.functions";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
});

function Leaderboard() {
  const q = useQuery({ queryKey: ["leaderboard"], queryFn: () => getLeaderboard() });
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="h-6 w-6 text-warning" />
          <h1 className="text-2xl font-black">Leaderboard</h1>
        </div>
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
                <Trophy className="h-3.5 w-3.5" /> {row.xp} XP
              </span>
            </li>
          ))}
          {q.data?.length === 0 && <p className="text-center text-muted-foreground">No players yet — be the first!</p>}
        </ol>
      </main>
    </div>
  );
}
