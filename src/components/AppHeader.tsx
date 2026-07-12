import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Coins, User as UserIcon, Trophy, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toggleTheme, isDark } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import type { Session } from "@supabase/supabase-js";

export function AppHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const [dark, setDark] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setDark(isDark());
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setCoins(null); setIsAdmin(false); return; }
    supabase.from("profiles").select("coins").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => setCoins(data?.coins ?? 0));
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session?.user?.id]);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
      <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elevated">
          <Trophy className="h-5 w-5" />
        </span>
        <span className="hidden sm:inline">Spot the Difference AI</span>
        <span className="sm:hidden">SpotDiff</span>
      </Link>
      <div className="flex items-center gap-2">
        {session && coins !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 text-sm font-semibold text-warning-foreground">
            <Coins className="h-4 w-4 text-warning" /> {coins}
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={() => { toggleTheme(); setDark(isDark()); }} aria-label="Toggle theme">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        {isAdmin && (
          <Link to="/admin"><Button variant="ghost" size="icon" aria-label="Admin"><ShieldCheck className="h-5 w-5" /></Button></Link>
        )}
        {session ? (
          <>
            <Link to="/profile"><Button variant="ghost" size="icon" aria-label="Profile"><UserIcon className="h-5 w-5" /></Button></Link>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={async () => { await supabase.auth.signOut(); }}>
              <LogOut className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <Link to="/auth"><Button variant="default" size="sm">Sign in</Button></Link>
        )}
      </div>
    </header>
  );
}
