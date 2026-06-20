import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "likhi6612rs@gmail.com";

const UpsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transport: z.number().min(0).max(10_000),
  food: z.number().min(0).max(10_000),
  energy: z.number().min(0).max(10_000),
  total: z.number().min(0).max(30_000),
});

export const upsertFootprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Make sure a profile row exists for admin listings.
    await supabase
      .from("profiles")
      .upsert({ id: userId, email: context.claims?.email ?? null }, { onConflict: "id" });

    const { error } = await supabase
      .from("footprints")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id,date" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyFootprints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("footprints")
      .select("date,transport,food,energy,total")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .limit(60);
    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  });

function isAdmin(email: string | undefined): boolean {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL;
}

export const adminGetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAdmin(context.claims?.email)) {
      throw new Error("Forbidden");
    }
    const { supabase } = context;

    const [{ data: profiles, error: pErr }, { data: footprints, error: fErr }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id,email,created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("footprints")
          .select("user_id,date,transport,food,energy,total,created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (fErr) throw new Error(fErr.message);

    const totalUsers = profiles?.length ?? 0;
    const totalEntries = footprints?.length ?? 0;
    const avgTotal =
      totalEntries > 0
        ? (footprints ?? []).reduce((a, f) => a + Number(f.total), 0) / totalEntries
        : 0;

    return {
      totalUsers,
      totalEntries,
      avgTotal,
      profiles: profiles ?? [],
      footprints: footprints ?? [],
    };
  });
