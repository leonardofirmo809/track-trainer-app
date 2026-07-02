import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  fullName: z.string().trim().min(2).max(100),
  companyId: z.string().uuid().optional(),
});

export const createCoachInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    // Token generation happens server-side — never exposed to frontend before save
    const token = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;

    const { data: invite, error } = await supabaseAdmin
      .from("coach_invites")
      .insert({ email: data.email, full_name: data.fullName, token, invited_by: userId, company_id: data.companyId ?? null })
      .select("id, token")
      .single();

    if (error) throw new Response(error.message, { status: 500 });
    // DB trigger `coach_invites_audit` logs `invite_created` automatically on INSERT.
    // O link é entregue manualmente (fora do sistema) — sem envio automático de e-mail.
    return { id: invite.id, token: invite.token };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const revokeCoachInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { error } = await supabaseAdmin
      .from("coach_invites")
      .update({ status: "revoked" })
      .eq("id", data.id);

    if (error) throw new Response(error.message, { status: 500 });
    // DB trigger logs `invite_revoked` automatically on UPDATE status→'revoked'.
    return { ok: true as const };
  });

export const resendCoachInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const newToken = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;

    const { error } = await supabaseAdmin
      .from("coach_invites")
      .update({
        token: newToken,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
      })
      .eq("id", data.id);

    if (error) throw new Response(error.message, { status: 500 });
    // DB trigger logs `invite_resent` automatically on UPDATE token+status→'pending'.
    return { ok: true as const, token: newToken };
  });
