import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
});

export const createCoachAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Response(roleErr.message, { status: 500 });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, created_by_admin: true },
    });
    if (error) throw new Response(error.message, { status: 400 });

    const newUserId = created.user?.id;
    if (!newUserId) throw new Response("Falha ao criar usuário", { status: 500 });

    // Defensive: ensure profile + coach role even if trigger is missing/failed
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, full_name: data.fullName }, { onConflict: "id" });
    if (profErr) throw new Response(`Perfil: ${profErr.message}`, { status: 500 });

    const { error: roleErr2 } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: "coach" }, { onConflict: "user_id,role" });
    if (roleErr2) throw new Response(`Papel: ${roleErr2.message}`, { status: 500 });

    await supabaseAdmin.from("admin_audit_log").insert({
      event_type: "coach_created_manual",
      target_email: data.email,
      target_user_id: created.user?.id,
      actor_id: userId,
      metadata: { full_name: data.fullName },
    });

    return { id: created.user?.id };
  });

const removeRoleSchema = z.object({ userId: z.string().uuid() });

export const removeCoachRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Response(roleErr.message, { status: 500 });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    if (data.userId === userId) {
      throw new Response("Você não pode remover seu próprio acesso.", { status: 400 });
    }

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const targetEmail = target?.user?.email ?? null;

    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "coach");
    if (delErr) throw new Response(delErr.message, { status: 500 });

    await supabaseAdmin.from("admin_audit_log").insert({
      event_type: "coach_role_removed",
      target_email: targetEmail,
      target_user_id: data.userId,
      actor_id: userId,
      metadata: {},
    });

    return { ok: true as const };
  });
