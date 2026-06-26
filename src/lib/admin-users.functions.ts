import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const [{ data: authData, error: usersErr }, { data: profiles, error: profErr }, { data: roles, error: rolesErr }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
        supabaseAdmin.from("profiles").select("id, full_name"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
      ]);

    if (usersErr) throw new Response(usersErr.message, { status: 500 });
    if (profErr) throw new Response(profErr.message, { status: 500 });
    if (rolesErr) throw new Response(rolesErr.message, { status: 500 });

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
    const rolesMap: Record<string, string[]> = {};
    for (const r of roles ?? []) {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r.role);
    }

    return (authData?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: profileMap[u.id] ?? null,
      roles: rolesMap[u.id] ?? [],
      created_at: u.created_at,
    }));
  });

const updateRolesSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(["admin", "coach", "runner"]),
  action: z.enum(["add", "remove"]),
});

export const updateUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateRolesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    if (data.action === "remove" && data.role === "admin") {
      if (data.targetUserId === userId) {
        throw new Response("Você não pode remover seu próprio acesso de administrador.", { status: 400 });
      }
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new Response("O sistema precisa ter ao menos um administrador.", { status: 400 });
      }
    }

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    const targetEmail = target?.user?.email ?? null;

    if (data.action === "add") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.targetUserId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Response(error.message, { status: 500 });
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId)
        .eq("role", data.role);
      if (error) throw new Response(error.message, { status: 500 });
    }

    const auditEvent = `${data.role}_${data.action === "add" ? "added" : "removed"}` as
      | "admin_added" | "admin_removed"
      | "coach_added" | "coach_removed"
      | "runner_added" | "runner_removed";

    await supabaseAdmin.from("admin_audit_log").insert({
      event_type: auditEvent,
      target_email: targetEmail,
      target_user_id: data.targetUserId,
      actor_id: userId,
      metadata: { via: "admin_usuarios" },
    });

    return { ok: true as const };
  });
