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
  const { data } = await client.storage.from("level-images").createSignedUrls(paths, 3600);
  const signedUrlByPath = new Map(data?.map((item) => [item.path, item.signedUrl]) ?? []);

  return urls.map((url) => {
    if (!url.startsWith("storage://")) return url;
    return signedUrlByPath.get(url.replace(/^storage:\/\//, "")) ?? url;
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