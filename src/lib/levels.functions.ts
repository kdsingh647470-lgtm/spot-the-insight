import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicBackendClient, signLevelImages } from "./levels.server";

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
    return { stars, coinsEarned, xpEarned, totalCoins: newCoins, totalXp: newXp, level: newLevel };
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

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicBackendClient();
  const { data, error } = await sb.rpc("get_leaderboard");
  if (error) throw new Error(error.message);
  return data ?? [];
});
