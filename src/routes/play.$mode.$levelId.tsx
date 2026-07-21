import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/components/game/Game";

export const Route = createFileRoute("/play/$mode/$levelId")({
  head: ({ params }) => ({
    meta: [
      { title: `Level — ${params.mode[0].toUpperCase()}${params.mode.slice(1)} — Spot the Difference AI` },
      { name: "description", content: "Play this spot-the-difference level. Find every hidden difference before your lives or timer run out." },
      { property: "og:title", content: "Spot the Difference AI — Level" },
      { property: "og:description", content: "Play this spot-the-difference level and earn stars, coins, and XP." },
      { property: "og:url", content: `/play/${params.mode}/${params.levelId}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayLevel,
});

function PlayLevel() {
  const { mode, levelId } = Route.useParams();
  const m = (["daily", "infinite", "timed", "relax", "story"] as const).includes(mode as any) ? (mode as any) : "story";
  return <Game mode={m} levelId={levelId} />;
}
