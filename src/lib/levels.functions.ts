import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicBackendClient, evaluateAchievements, rewardForStreak, signLevelImages, todayUtc, yesterdayUtc } from "./levels.server";

export const listLevels = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicBackendClient();
  const { data, error } = await sb.from("levels").select("id, world, level_number, title, difficulty, image_a_url")
    .eq("published", true).order("world").order("level_number");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getLevelById = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = createPublicBackendClient();
    const { data: lvl, error } = await sb.from("levels").select("*").eq("id", data.id).eq("published", true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!lvl) throw new Error("Level not found");
    const { data: diffs } = await sb.from("differences").select("id, x, y, radius, label").eq("level_id", lvl.id);
    const [signedA, signedB] = await signLevelImages(sb, [lvl.image_a_url, lvl.image_b_url]);
    return { ...lvl, image_a_url: signedA, image_b_url: signedB, differences: diffs ?? [] };
  });

export const getRandomLevel = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicBackendClient();
  const { data, error } = await sb.from("levels").select("id").eq("published", true).limit(200);
  if (error) throw new Error(error.message);
  if (!data?.length) return null;
  const pick = data[Math.floor(Math.random() * data.length)];
  return pick.id;
});

// Story map: every published level, grouped client-side by world.
export const getStoryMap = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicBackendClient();
  const { data, error } = await sb.from("levels")
    .select("id, world, level_number, title, difficulty, image_a_url")
    .eq("published", true)
    .order("world").order("level_number");
  if (error) throw new Error(error.message);
  const [signed] = await Promise.all([
    signLevelImages(sb, (data ?? []).map((l) => l.image_a_url)),
  ]);
  return (data ?? []).map((l, i) => ({ ...l, image_a_url: signed[i] }));
});

// Best stars per level for the signed-in user.
export const getMyStoryProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("level_completions")
      .select("level_id, stars")
      .eq("user_id", context.userId);
    const best: Record<string, number> = {};
    for (const c of data ?? []) {
      if (!best[c.level_id] || c.stars > best[c.level_id]) best[c.level_id] = c.stars;
    }
    return best;
  });

// Next level in the same world by (world, level_number). Returns null if
// the current level is the last in its world (world complete).
export const getNextStoryLevel = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ currentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = createPublicBackendClient();
    const { data: cur } = await sb.from("levels").select("world, level_number").eq("id", data.currentId).maybeSingle();
    if (!cur) return null;
    const { data: nxt } = await sb.from("levels")
      .select("id")
      .eq("published", true)
      .eq("world", cur.world)
      .gt("level_number", cur.level_number)
      .order("level_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    return nxt?.id ?? null;
  });


export const getDailyLevel = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicBackendClient();
  const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  // 1) Explicit daily assignment for today wins.
  const { data: assigned } = await sb.from("levels")
    .select("id").eq("is_daily", true).eq("daily_date", today).eq("published", true).maybeSingle();
  if (assigned) return assigned.id;
  // 2) Deterministic fallback: hash today's date to an index into the
  //    ordered pool of published levels. Every player gets the same level
  //    until UTC midnight, when the date string changes and the index rolls.
  const { data: pool } = await sb.from("levels")
    .select("id").eq("published", true).order("created_at", { ascending: true }).order("id", { ascending: true });
  if (!pool?.length) return null;
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < today.length; i++) {
    h ^= today.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % pool.length;
  return pool[idx].id;
});

export const getDailyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const startIso = new Date(today + "T00:00:00.000Z").toISOString();
    const { data } = await context.supabase
      .from("level_completions")
      .select("time_ms, stars, level_id, completed_at")
      .eq("user_id", context.userId)
      .eq("mode", "daily")
      .gte("completed_at", startIso)
      .order("completed_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return { date: today, completion: data ?? null };
  });


export const submitCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    level_id: z.string().uuid(),
    time_ms: z.number().int().nonnegative(),
    hints_used: z.number().int().nonnegative(),
    mistakes: z.number().int().nonnegative(),
    mode: z.enum(["story", "daily", "infinite", "timed", "relax"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.mode === "daily") {
      // One daily completion per user per UTC date.
      const startIso = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
      const { data: existing } = await context.supabase
        .from("level_completions")
        .select("id")
        .eq("user_id", context.userId)
        .eq("mode", "daily")
        .gte("completed_at", startIso)
        .limit(1)
        .maybeSingle();
      if (existing) throw new Error("Daily challenge already completed today");
    }
    const stars = data.mistakes === 0 && data.hints_used === 0 ? 3 : data.mistakes <= 1 ? 2 : 1;
    const coinsEarned = 50 + stars * 25 + (data.time_ms < 30000 ? 25 : 0);
    const xpEarned = 20 + stars * 10;
    const { error } = await context.supabase.from("level_completions").insert({
      user_id: context.userId,
      level_id: data.level_id,
      time_ms: data.time_ms,
      hints_used: data.hints_used,
      mistakes: data.mistakes,
      stars,
      coins_earned: coinsEarned,
      xp_earned: xpEarned,
      mode: data.mode,
    });
    if (error) throw new Error(error.message);
    // update profile
    const { data: prof } = await context.supabase.from("profiles").select("coins, xp, level").eq("id", context.userId).maybeSingle();
    const newCoins = (prof?.coins ?? 0) + coinsEarned;
    const newXp = (prof?.xp ?? 0) + xpEarned;
    const newLevel = Math.max(1, Math.floor(newXp / 200) + 1);
    await context.supabase.from("profiles").update({ coins: newCoins, xp: newXp, level: newLevel }).eq("id", context.userId);
    const unlocked = await evaluateAchievements(context.supabase, context.userId, {
      lastCompletion: { time_ms: data.time_ms, hints_used: data.hints_used, mistakes: data.mistakes, mode: data.mode },
    });
    return { stars, coinsEarned, xpEarned, totalCoins: newCoins, totalXp: newXp, level: newLevel, unlocked };
  });

export const spendHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cost = 25;
    const { data: prof } = await context.supabase.from("profiles").select("coins").eq("id", context.userId).maybeSingle();
    if (!prof || prof.coins < cost) throw new Error("Not enough coins");
    await context.supabase.from("profiles").update({ coins: prof.coins - cost }).eq("id", context.userId);
    return { remaining: prof.coins - cost };
  });

export const getDailyReward = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = todayUtc();
    const startIso = new Date(today + "T00:00:00.000Z").toISOString();
    const [{ data: completion }, { data: reward }] = await Promise.all([
      context.supabase.from("level_completions").select("id").eq("user_id", context.userId).eq("mode", "daily").gte("completed_at", startIso).limit(1).maybeSingle(),
      context.supabase.from("daily_rewards").select("last_claim_date, streak").eq("user_id", context.userId).maybeSingle(),
    ]);
    const claimedToday = reward?.last_claim_date === today;
    const currentStreak = reward?.streak ?? 0;
    // If already claimed today, streak already reflects today; otherwise preview next streak.
    const nextStreak = claimedToday ? currentStreak : (reward?.last_claim_date === yesterdayUtc() ? currentStreak + 1 : 1);
    const preview = rewardForStreak(nextStreak);
    return {
      date: today,
      dailyCompleted: !!completion,
      claimedToday,
      streak: currentStreak,
      nextStreak,
      preview,
    };
  });

export const claimDailyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = todayUtc();
    const startIso = new Date(today + "T00:00:00.000Z").toISOString();
    // Must have finished the daily challenge today.
    const { data: completion } = await context.supabase
      .from("level_completions").select("id").eq("user_id", context.userId).eq("mode", "daily").gte("completed_at", startIso).limit(1).maybeSingle();
    if (!completion) throw new Error("Finish today's daily challenge first");
    // One claim per UTC day.
    const { data: existing } = await context.supabase
      .from("daily_rewards").select("last_claim_date, streak").eq("user_id", context.userId).maybeSingle();
    if (existing?.last_claim_date === today) throw new Error("Daily reward already claimed today");
    const nextStreak = existing?.last_claim_date === yesterdayUtc() ? existing.streak + 1 : 1;
    const { coins, xp } = rewardForStreak(nextStreak);
    // Upsert reward record (user_id is primary key).
    const { error: upErr } = await context.supabase
      .from("daily_rewards")
      .upsert({ user_id: context.userId, last_claim_date: today, streak: nextStreak }, { onConflict: "user_id" });
    if (upErr) throw new Error(upErr.message);
    // Credit profile.
    const { data: prof } = await context.supabase.from("profiles").select("coins, xp, level").eq("id", context.userId).maybeSingle();
    const newCoins = (prof?.coins ?? 0) + coins;
    const newXp = (prof?.xp ?? 0) + xp;
    const newLevel = Math.max(1, Math.floor(newXp / 200) + 1);
    await context.supabase.from("profiles").update({ coins: newCoins, xp: newXp, level: newLevel }).eq("id", context.userId);
    const unlocked = await evaluateAchievements(context.supabase, context.userId, { streak: nextStreak });
    return { coins, xp, streak: nextStreak, totalCoins: newCoins, totalXp: newXp, level: newLevel, unlocked };
  });


export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  // Read via service role so we can join profiles without opening the table to anon,
  // and only project the columns safe to expose publicly.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, avatar_url, xp, level")
    .order("xp", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
});

