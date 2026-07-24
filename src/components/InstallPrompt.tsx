import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "spotdiff:install-dismissed:v1";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw && Date.now() - Number(raw) < DISMISS_MS) return;
    } catch {}

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS fallback: show manual instructions after brief delay
    if (isIOS()) {
      const t = setTimeout(() => { setIos(true); setVisible(true); }, 2500);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onBIP); };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const res = await deferred.userChoice;
    if (res.outcome === "accepted") setVisible(false);
    else dismiss();
    setDeferred(null);
  };

  return (
    <div className="mt-6 flex items-center gap-4 rounded-3xl border border-accent/40 bg-gradient-to-br from-accent/10 to-primary/10 p-4 shadow-soft">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-elevated">
        <Download className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Install app</p>
        <p className="text-base font-black">Play offline, fullscreen</p>
        <p className="truncate text-xs text-muted-foreground">
          {ios ? "Tap Share, then Add to Home Screen" : "Add SpotDiff to your home screen"}
        </p>
      </div>
      {!ios && deferred && (
        <Button size="sm" onClick={install} className="rounded-full font-bold">Install</Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-full p-1 text-muted-foreground hover:bg-background/60"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
