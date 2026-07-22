import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    const { data: completions } = await context.supabase
      .from("level_completions")
      .select("id, stars, time_ms, mode, hints_used, mistakes, completed_at, level_id, levels(world)")
      .eq("user_id", context.userId)
      .order("completed_at", { ascending: false });
    const { data: unlocked } = await context.supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", context.userId);
    const { data: all } = await context.supabase.from("achievements").select("*");
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const { data: daily } = await context.supabase.from("daily_rewards").select("*").eq("user_id", context.userId).maybeSingle();

    const list = completions ?? [];
    const total = list.length;
    const sumTime = list.reduce((s, c) => s + (c.time_ms ?? 0), 0);
    const sumHints = list.reduce((s, c) => s + (c.hints_used ?? 0), 0);
    const sumMistakes = list.reduce((s, c) => s + (c.mistakes ?? 0), 0);
    const perfect = list.filter((c) => (c.mistakes ?? 0) === 0 && (c.hints_used ?? 0) === 0).length;
    const totalStars = list.reduce((s, c) => s + (c.stars ?? 0), 0);
    const uniqueLevels = new Set(list.map((c) => c.level_id)).size;
    const timesOnly = list.map((c) => c.time_ms || 0).filter((t) => t > 0);
    const bestTimeMs = timesOnly.length ? Math.min(...timesOnly) : 0;
    const totalCorrect = total * 5;
    const accuracy = totalCorrect + sumMistakes > 0
      ? Math.round((totalCorrect / (totalCorrect + sumMistakes)) * 100)
      : 100;
    const byWorld: Record<number, number> = {};
    for (const c of list) {
      const w = (c as { levels?: { world?: number } | null }).levels?.world ?? 0;
      if (w) byWorld[w] = (byWorld[w] ?? 0) + 1;
    }
    const byMode: Record<string, number> = {};
    for (const c of list) byMode[c.mode] = (byMode[c.mode] ?? 0) + 1;

    return {
      profile,
      completions: list.slice(0, 20),
      achievements: (all ?? []).map((a) => {
        const u = unlocked?.find((x) => x.achievement_id === a.id);
        return { ...a, unlocked: !!u, unlocked_at: u?.unlocked_at ?? null };
      }),
      isAdmin: !!roles?.some((r) => r.role === "admin"),
      stats: {
        totalPlays: total,
        uniqueLevels,
        totalStars,
        perfect,
        accuracy,
        avgTimeMs: total ? Math.round(sumTime / total) : 0,
        bestTimeMs,
        totalHints: sumHints,
        totalMistakes: sumMistakes,
        currentStreak: daily?.streak ?? 0,
        lastClaimDate: daily?.last_claim_date ?? null,
        byWorld,
        byMode,
      },
    };
  });

export const claimDaily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await context.supabase.from("daily_rewards").select("*").eq("user_id", context.userId).maybeSingle();
    if (existing?.last_claim_date === today) throw new Error("Already claimed today");
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = existing?.last_claim_date === yesterday ? (existing.streak + 1) : 1;
    const reward = 50 + Math.min(streak, 7) * 10;
    await context.supabase.from("daily_rewards").upsert({ user_id: context.userId, last_claim_date: today, streak });
    const { data: prof } = await context.supabase.from("profiles").select("coins").eq("id", context.userId).maybeSingle();
    await context.supabase.from("profiles").update({ coins: (prof?.coins ?? 0) + reward }).eq("id", context.userId);
    return { reward, streak };
  });

export const setPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("profiles").update({ is_premium: data.enabled }).eq("id", context.userId);
    return { ok: true };
  });
