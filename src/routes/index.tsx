import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Calendar, Infinity as InfIcon, Timer, Leaf, Trophy, Map as MapIcon, Play, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AdBanner } from "@/components/AdBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useResume, clearResume } from "@/lib/audio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spot the Difference AI — Relaxing Puzzle Game" },
      { name: "description", content: "A calm, addictive spot-the-difference puzzle game with AI-generated levels, daily challenges, achievements, and a global leaderboard." },
      { property: "og:title", content: "Spot the Difference AI — Relaxing Puzzle Game" },
      { property: "og:description", content: "AI-generated levels, daily challenges, and leaderboards. Play Story, Infinite, Timed, or Relax modes." },
      { property: "og:url", content: "https://spot-the-insight.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://spot-the-insight.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Spot the Difference AI",
          applicationCategory: "GameApplication",
          operatingSystem: "Any",
          url: "https://spot-the-insight.lovable.app/",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: Home,
});

const modes = [
  { mode: "daily", icon: Calendar, title: "Daily Challenge", desc: "One exclusive level every day", tint: "bg-accent/15 text-accent" },
  { mode: "infinite", icon: InfIcon, title: "Infinite Levels", desc: "Random levels forever", tint: "bg-primary/15 text-primary" },
  { mode: "timed", icon: Timer, title: "Timed Mode", desc: "Beat the clock", tint: "bg-destructive/15 text-destructive" },
  { mode: "relax", icon: Leaf, title: "Relax Mode", desc: "No timer, unlimited hints", tint: "bg-success/15 text-success" },
] as const;


function Home() {
  const resume = useResume();
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-6 text-primary-foreground shadow-elevated sm:p-10">
          <Sparkles className="absolute right-4 top-4 h-8 w-8 opacity-40" />
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Puzzle · AI-generated</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">Find every hidden difference.</h1>
          <p className="mt-3 max-w-md text-sm opacity-90 sm:text-base">
            Two beautiful scenes, five tiny changes. Tap them all before your lives run out.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/story" className="rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-bold text-primary shadow-soft">
              Play story
            </Link>
            <Link to="/play/infinite" className="rounded-full border border-primary-foreground/40 px-5 py-2.5 text-sm font-semibold">
              Infinite
            </Link>
            <Link to="/leaderboard" className="inline-flex items-center gap-1 rounded-full border border-primary-foreground/40 px-5 py-2.5 text-sm font-semibold">
              <Trophy className="h-4 w-4" /> Leaderboard
            </Link>
          </div>
        </section>

        {resume && resume.levelId && (
          <div className="relative mt-6 flex items-center gap-4 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-4 shadow-soft">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
              <Play className="h-7 w-7 fill-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Continue playing</p>
              <p className="truncate text-base font-black">{resume.title ?? "Last level"}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">{resume.mode} mode</p>
            </div>
            <Link
              to="/play/$mode/$levelId"
              params={{ mode: resume.mode, levelId: resume.levelId }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-soft"
            >
              Resume
            </Link>
            <button
              type="button"
              onClick={() => clearResume()}
              aria-label="Dismiss"
              className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-background/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}


        <Link
          to="/story"
          className="mt-6 flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-fuchsia-500 text-white">
            <MapIcon className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Story mode</span>
            <span className="block text-base font-black">World Map</span>
            <span className="block truncate text-sm text-muted-foreground">4 worlds · handcrafted campaign</span>
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Explore</span>
        </Link>


        <h2 className="mt-8 mb-3 px-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Game modes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modes.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${m.tint}`}>
                <m.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold">{m.title}</span>
                <span className="block truncate text-sm text-muted-foreground">{m.desc}</span>
              </span>
            </Link>
          ))}
        </div>

        <InstallPrompt />
        <AdBanner slot="home-bottom" />
      </main>
    </div>
  );
}
