import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export function createPublicBackendClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export async function signLevelImages(
  client: ReturnType<typeof createPublicBackendClient>,
  urls: string[],
) {
  const paths = urls.map((url) => url.replace(/^storage:\/\//, ""));
  const { data, error } = await client.storage.from("level-images").createSignedUrls(paths, 3600);
  if (error) console.error("signLevelImages error", error.message);
  return urls.map((url, i) => {
    if (!url.startsWith("storage://")) return url;
    return data?.[i]?.signedUrl ?? url;
  });
}


export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayUtc() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function rewardForStreak(streak: number) {
  const cap = Math.min(streak, 7);
  return { coins: 100 + cap * 20, xp: 25 + cap * 5 };
}

// ---- Achievements -------------------------------------------------------
// Evaluate all rules against the user's current stats and unlock any
// newly-earned achievements, granting their coin/xp rewards. Returns the
// list of newly unlocked achievement rows so callers can surface toasts.

type SupabaseUserClient = { from: (table: string) => any };

export type UnlockedAchievement = {
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  coin_reward: number;
  xp_reward: number;
};

type UnlockContext = {
  lastCompletion?: { time_ms: number; hints_used: number; mistakes: number; mode: string };
  streak?: number;
};

export async function evaluateAchievements(
  supabase: SupabaseUserClient,
  userId: string,
  ctx: UnlockContext,
): Promise<UnlockedAchievement[]> {
  const [{ data: allAch }, { data: already }, { data: completions }, { data: profile }] = await Promise.all([
    supabase.from("achievements").select("id, code, title, description, icon, coin_reward, xp_reward"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
    supabase.from("level_completions").select("hints_used, mistakes, mode").eq("user_id", userId),
    supabase.from("profiles").select("coins, xp").eq("id", userId).maybeSingle(),
  ]);
  if (!allAch) return [];
  const unlockedIds = new Set<string>((already ?? []).map((r: any) => r.achievement_id));
  const totalCompletions = completions?.length ?? 0;
  const noHintCompletions = (completions ?? []).filter((c: any) => c.hints_used === 0).length;
  const dailyCompletions = (completions ?? []).filter((c: any) => c.mode === "daily").length;
  const coins = profile?.coins ?? 0;
  const last = ctx.lastCompletion;
  const streak = ctx.streak ?? 0;

  const shouldUnlock = (code: string) => {
    switch (code) {
      case "first_level": return totalCompletions >= 1;
      case "level_10": return totalCompletions >= 10;
      case "level_50": return totalCompletions >= 50;
      case "perfect_level": return !!last && last.mistakes === 0 && last.hints_used === 0;
      case "speed_demon": return !!last && last.time_ms < 30000;
      case "no_hints_5": return noHintCompletions >= 5;
      case "daily_5": return dailyCompletions >= 5;
      case "coin_1000": return coins >= 1000;
      case "streak_3": return streak >= 3;
      case "streak_7": return streak >= 7;
      default: return false;
    }
  };

  const newlyEarned = allAch.filter((a: any) => !unlockedIds.has(a.id) && shouldUnlock(a.code));
  if (!newlyEarned.length) return [];

  const { error: insErr } = await supabase.from("user_achievements").insert(
    newlyEarned.map((a: any) => ({ user_id: userId, achievement_id: a.id })),
  );
  if (insErr) {
    console.error("unlock insert error", insErr.message);
    return [];
  }
  const bonusCoins = newlyEarned.reduce((s: number, a: any) => s + (a.coin_reward ?? 0), 0);
  const bonusXp = newlyEarned.reduce((s: number, a: any) => s + (a.xp_reward ?? 0), 0);
  if (bonusCoins || bonusXp) {
    const newCoins = coins + bonusCoins;
    const newXp = (profile?.xp ?? 0) + bonusXp;
    const newLevel = Math.max(1, Math.floor(newXp / 200) + 1);
    await supabase.from("profiles").update({ coins: newCoins, xp: newXp, level: newLevel }).eq("id", userId);
  }
  return newlyEarned.map((a: any) => ({
    code: a.code, title: a.title, description: a.description, icon: a.icon,
    coin_reward: a.coin_reward, xp_reward: a.xp_reward,
  }));
}