import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/components/game/Game";

export const Route = createFileRoute("/play/$mode")({
  component: PlayMode,
});

function PlayMode() {
  const { mode } = Route.useParams();
  const m = (["daily", "infinite", "timed", "relax", "story"] as const).includes(mode as any) ? (mode as any) : "infinite";
  return <Game mode={m} />;
}
