import { Sparkles } from "lucide-react";

export function AdBanner({ slot = "banner" }: { slot?: string }) {
  return (
    <div
      data-ad-slot={slot}
      className="mx-auto my-4 flex max-w-3xl items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground"
    >
      <Sparkles className="h-3.5 w-3.5" /> Ad slot: {slot}
    </div>
  );
}
