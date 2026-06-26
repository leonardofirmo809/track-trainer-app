import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertGlobalAdmin(userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Response("Forbidden", { status: 403 });
}

// ── listCompanies ─────────────────────────────────────────────────────────────

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalAdmin(context.userId);

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, slug, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Response(error.message, { status: 500 });
    return data ?? [];
  });

// ── createCompany ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug: somente letras minúsculas, números e hífens.")
    .max(80)
    .optional(),
});

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { data: company, error } = await supabaseAdmin
      .from("companies")
      .insert({ name: data.name, slug: data.slug || null, created_by: context.userId })
      .select("id, name, slug, status, created_at")
      .single();

    if (error) {
      const msg = error.code === "23505" ? "Já existe uma empresa com este slug." : error.message;
      throw new Response(msg, { status: 400 });
    }
    return company;
  });

// ── updateCompany ─────────────────────────────────────────────────────────────

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug: somente letras minúsculas, números e hífens.")
    .max(80)
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { error } = await supabaseAdmin
      .from("companies")
      .update({ name: data.name, slug: data.slug || null, status: data.status })
      .eq("id", data.id);

    if (error) {
      const msg = error.code === "23505" ? "Já existe uma empresa com este slug." : error.message;
      throw new Response(msg, { status: 400 });
    }
    return { ok: true as const };
  });

// ── listCompanyMembers ────────────────────────────────────────────────────────

const companyIdSchema = z.object({ companyId: z.string().uuid() });

export const listCompanyMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => companyIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { data: members, error } = await supabaseAdmin
      .from("company_members")
      .select("id, user_id, role, can_manage_students, can_manage_training, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: true });

    if (error) throw new Response(error.message, { status: 500 });

    const [{ data: authData }, { data: profiles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from("profiles").select("id, full_name"),
    ]);

    const emailMap = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

    return (members ?? []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      can_manage_students: m.can_manage_students,
      can_manage_training: m.can_manage_training,
      created_at: m.created_at,
      email: emailMap[m.user_id] ?? "",
      full_name: nameMap[m.user_id] ?? null,
    }));
  });

// ── addCompanyMember ──────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "coach"]),
});

export const addCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { data: user, error: userErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userErr || !user?.user) throw new Response("Usuário não encontrado.", { status: 404 });

    // upsert: se já é membro, atualiza o papel
    const { error } = await supabaseAdmin
      .from("company_members")
      .upsert(
        { company_id: data.companyId, user_id: data.userId, role: data.role },
        { onConflict: "company_id,user_id" },
      );

    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

// ── removeCompanyMember ───────────────────────────────────────────────────────

const removeMemberSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const removeCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { error } = await supabaseAdmin
      .from("company_members")
      .delete()
      .eq("company_id", data.companyId)
      .eq("user_id", data.userId);

    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

// ── updateCompanyMemberRole ───────────────────────────────────────────────────

const updateMemberRoleSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "coach"]),
});

export const updateCompanyMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateMemberRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { error } = await supabaseAdmin
      .from("company_members")
      .update({ role: data.role })
      .eq("company_id", data.companyId)
      .eq("user_id", data.userId);

    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

// ── updateCompanyMemberPermissions ────────────────────────────────────────────

const updatePermissionsSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  canManageStudents: z.boolean(),
  canManageTraining: z.boolean(),
});

export const updateCompanyMemberPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updatePermissionsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { error } = await supabaseAdmin
      .from("company_members")
      .update({
        can_manage_students: data.canManageStudents,
        can_manage_training: data.canManageTraining,
      })
      .eq("company_id", data.companyId)
      .eq("user_id", data.userId);

    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });
