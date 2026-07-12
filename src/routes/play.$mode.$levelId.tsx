import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/components/game/Game";

export const Route = createFileRoute("/play/$mode/$levelId")({
  component: PlayLevel,
});

function PlayLevel() {
  const { mode, levelId } = Route.useParams();
  const m = (["daily", "infinite", "timed", "relax", "story"] as const).includes(mode as any) ? (mode as any) : "story";
  return <Game mode={m} levelId={levelId} />;
}
