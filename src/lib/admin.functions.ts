import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

export const makeMeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Admin already exists. Ask an admin to promote you.");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdminLevels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("levels").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createLevelFromBase64 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1),
    world: z.number().int().min(1).default(1),
    difficulty: z.number().int().min(1).max(6).default(1),
    imageA_b64: z.string().min(100),
    imageB_b64: z.string().min(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = crypto.randomUUID();
    const pathA = `${id}/a.png`;
    const pathB = `${id}/b.png`;
    const bytesA = Uint8Array.from(atob(data.imageA_b64), (c) => c.charCodeAt(0));
    const bytesB = Uint8Array.from(atob(data.imageB_b64), (c) => c.charCodeAt(0));
    const up1 = await supabaseAdmin.storage.from("level-images").upload(pathA, bytesA, { contentType: "image/png", upsert: true });
    if (up1.error) throw new Error(up1.error.message);
    const up2 = await supabaseAdmin.storage.from("level-images").upload(pathB, bytesB, { contentType: "image/png", upsert: true });
    if (up2.error) throw new Error(up2.error.message);
    const { data: lvl, error } = await supabaseAdmin.from("levels").insert({
      id,
      title: data.title,
      world: data.world,
      level_number: 1,
      difficulty: data.difficulty,
      image_a_url: `storage://${pathA}`,
      image_b_url: `storage://${pathB}`,
      published: false,
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return lvl;
  });

export const setDifferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    level_id: z.string().uuid(),
    diffs: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), radius: z.number().min(0.02).max(0.2), label: z.string().optional() })).max(20),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("differences").delete().eq("level_id", data.level_id);
    if (data.diffs.length) {
      const rows = data.diffs.map((d) => ({ ...d, level_id: data.level_id }));
      const { error } = await supabaseAdmin.from("differences").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: data.diffs.length };
  });

export const publishLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), published: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("levels").update({ published: data.published }).eq("id", data.id);
    return { ok: true };
  });

export const deleteLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("level-images").remove([`${data.id}/a.png`, `${data.id}/b.png`]);
    await supabaseAdmin.from("levels").delete().eq("id", data.id);
    return { ok: true };
  });

export const getAdminLevel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lvl } = await supabaseAdmin.from("levels").select("*").eq("id", data.id).maybeSingle();
    if (!lvl) throw new Error("Not found");
    const { data: diffs } = await supabaseAdmin.from("differences").select("*").eq("level_id", data.id);
    const paths = [lvl.image_a_url.replace("storage://", ""), lvl.image_b_url.replace("storage://", "")];
    const { data: signed } = await supabaseAdmin.storage.from("level-images").createSignedUrls(paths, 3600);
    return {
      level: lvl,
      differences: diffs ?? [],
      signedA: signed?.[0]?.signedUrl ?? "",
      signedB: signed?.[1]?.signedUrl ?? "",
    };
  });
