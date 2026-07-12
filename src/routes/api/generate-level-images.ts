import { createFileRoute } from "@tanstack/react-router";

// Streaming AI image gen for admin — generates a paired scene (A + B) with 5 differences described in prompt.
// Client-driven: admin sends a scene idea, we call Gemini image model twice with tightly related prompts.
export const Route = createFileRoute("/api/generate-level-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const body = (await request.json()) as { prompt: string; variant: "a" | "b"; differencesHint?: string };
        const scene = body.prompt.slice(0, 400);
        const variantInstruction = body.variant === "a"
          ? `Wide illustrated scene, painterly cartoon style, vivid colors, cheerful, high detail. Scene: ${scene}. Aspect ratio 4:3.`
          : `EXACT SAME wide illustrated scene as before (same composition, camera, style, colors), same characters and objects, but with these 5 tiny modifications: ${body.differencesHint ?? "change color of one object, remove one small item, add one small item, swap one shape, alter one pattern"}. Keep everything else identical. Painterly cartoon style. Scene: ${scene}. Aspect ratio 4:3.`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image",
            messages: [{ role: "user", content: variantInstruction }],
            modalities: ["image", "text"],
            stream: true,
          }),
        });
        if (!upstream.ok || !upstream.body) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
