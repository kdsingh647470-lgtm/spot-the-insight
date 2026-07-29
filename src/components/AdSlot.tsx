import { useEffect, useRef } from "react";

// AdSense in-feed unit. The loader script is injected once from __root.tsx.
// Each <ins> block gets pushed to `adsbygoogle` after mount so navigating
// between routes still fills the slot.
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ label = "Sponsored" }: { label?: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // no-op; script may not have loaded yet in dev
    }
  }, []);

  return (
    <div
      role="complementary"
      aria-label="Advertisement"
      className="mx-3 my-2 overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40"
    >
      <div className="px-2 pt-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
        {label}
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 92 }}
        data-ad-client="ca-pub-5308295667973900"
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
