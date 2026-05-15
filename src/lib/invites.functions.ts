import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8).max(72),
});

export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { data: invite, error: invErr } = await supabaseAdmin
      .from("coach_invites")
      .select("id, email, full_name, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (invErr) throw new Response(invErr.message, { status: 500 });
    if (!invite) throw new Response("Convite não encontrado.", { status: 404 });
    if (invite.status !== "pending") throw new Response("Este convite já foi utilizado ou cancelado.", { status: 400 });
    if (new Date(invite.expires_at) < new Date()) throw new Response("Este convite expirou.", { status: 400 });

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: invite.full_name },
    });
    if (error) throw new Response(error.message, { status: 400 });

    return { ok: true as const, email: invite.email };
  });
