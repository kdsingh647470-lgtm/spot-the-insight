import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/components/game/Game";

const MODE_META: Record<string, { title: string; description: string }> = {
  daily:    { title: "Daily Challenge — Spot the Difference AI",   description: "Play today's exclusive daily spot-the-difference puzzle and climb the streak leaderboard." },
  infinite: { title: "Infinite Levels — Spot the Difference AI",   description: "Endless spot-the-difference puzzles — keep spotting differences to build combos and score." },
  timed:    { title: "Timed Mode — Spot the Difference AI",        description: "Race against a 90-second clock and earn bonus time for every level you clear." },
  relax:    { title: "Relax Mode — Spot the Difference AI",        description: "No timer, unlimited hints. A calm way to play spot-the-difference puzzles." },
  story:    { title: "Story Mode — Spot the Difference AI",        description: "Explore four themed worlds of hand-crafted spot-the-difference puzzles." },
};

export const Route = createFileRoute("/play/$mode/")({
  head: ({ params }) => {
    const m = MODE_META[params.mode] ?? MODE_META.infinite;
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.title },
        { property: "og:description", content: m.description },
        { property: "og:url", content: `/play/${params.mode}` },
      ],
      links: [{ rel: "canonical", href: `https://spot-the-insight.lovable.app/play/${params.mode}` }],
    };
  },
  component: PlayMode,
});

function PlayMode() {
  const { mode } = Route.useParams();
  const m = (["daily", "infinite", "timed", "relax", "story"] as const).includes(mode as any) ? (mode as any) : "infinite";
  return <Game mode={m} />;
}
