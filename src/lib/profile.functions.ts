import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    const { data: completions } = await context.supabase.from("level_completions").select("id, stars, time_ms, mode, completed_at, level_id").eq("user_id", context.userId).order("completed_at", { ascending: false }).limit(20);
    const { data: unlocked } = await context.supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", context.userId);
    const { data: all } = await context.supabase.from("achievements").select("*");
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    return {
      profile,
      completions: completions ?? [],
      achievements: (all ?? []).map((a) => ({ ...a, unlocked: unlocked?.some((u) => u.achievement_id === a.id) ?? false })),
      isAdmin: !!roles?.some((r) => r.role === "admin"),
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
