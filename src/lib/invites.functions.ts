import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveInvitePermissions } from "@/lib/invite-permissions";

export { resolveInvitePermissions };

const schema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8).max(72),
});

export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { data: invite, error: invErr } = await supabaseAdmin
      .from("coach_invites")
      .select("id, email, full_name, status, expires_at, company_id, can_manage_students, can_manage_training")
      .eq("token", data.token)
      .maybeSingle();

    if (invErr) throw new Response(invErr.message, { status: 500 });
    if (!invite) throw new Response("Convite não encontrado.", { status: 404 });
    if (invite.status !== "pending") throw new Response("Este convite já foi utilizado ou cancelado.", { status: 400 });
    if (new Date(invite.expires_at) < new Date()) throw new Response("Este convite expirou.", { status: 400 });

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: invite.full_name },
    });
    if (error || !created?.user) throw new Response(error?.message ?? "Erro ao criar usuário.", { status: 400 });

    // Explicitly mark invite as accepted regardless of trigger outcome.
    await supabaseAdmin
      .from("coach_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    // If the invite was linked to a company, add the coach as a member automatically.
    // Permissions come from the invite (set explicitly by the admin who created it).
    if (invite.company_id) {
      const permissions = resolveInvitePermissions(invite);
      await supabaseAdmin
        .from("company_members")
        .upsert(
          {
            company_id: invite.company_id,
            user_id: created.user.id,
            role: "coach",
            can_manage_students: permissions.can_manage_students,
            can_manage_training: permissions.can_manage_training,
          },
          { onConflict: "company_id,user_id" },
        );
    }

    return { ok: true as const, email: invite.email };
  });
