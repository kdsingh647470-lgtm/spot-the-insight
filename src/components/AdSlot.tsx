// Lightweight placeholder ad unit. Replace `data-ad-slot` and the inner script
// injection with your provider (AdSense, Ezoic, etc.) when ready — the layout
// keeps a stable footprint so shuffling ads never breaks the level list.
export function AdSlot({ label = "Sponsored" }: { label?: string }) {
  return (
    <div
      role="complementary"
      aria-label="Advertisement"
      className="mx-3 my-2 flex min-h-[92px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 text-center"
    >
      <div className="px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
          {label}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Your ad could be here — support the game while you play.
        </div>
      </div>
    </div>
  );
}
