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