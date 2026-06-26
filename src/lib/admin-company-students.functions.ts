import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertGlobalAdmin(userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Response("Forbidden", { status: 403 });
}

// ── listCompanyStudents ───────────────────────────────────────────────────────

const companyIdSchema = z.object({ companyId: z.string().uuid() });

export const listCompanyStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => companyIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id, full_name, email, phone, coach_id, created_at")
      .eq("company_id", data.companyId)
      .order("full_name", { ascending: true });

    if (error) throw new Response(error.message, { status: 500 });
    if (!students || students.length === 0) return [];

    // Enrich with coach name from profiles
    const coachIds = [...new Set(students.map((s) => s.coach_id).filter(Boolean) as string[])];
    const { data: profiles } = coachIds.length > 0
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", coachIds)
      : { data: [] };

    const coachNameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

    return students.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      coach_id: s.coach_id,
      coach_name: s.coach_id ? (coachNameMap[s.coach_id] ?? null) : null,
      created_at: s.created_at,
    }));
  });

// ── listStudentsWithoutCompany ────────────────────────────────────────────────

export const listStudentsWithoutCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalAdmin(context.userId);

    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id, full_name, email, phone, coach_id")
      .is("company_id", null)
      .order("full_name", { ascending: true });

    if (error) throw new Response(error.message, { status: 500 });
    return students ?? [];
  });

// ── addStudentToCompany ───────────────────────────────────────────────────────

const addStudentSchema = z.object({
  companyId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export const addStudentToCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addStudentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    // Verify student exists
    const { data: student, error: findErr } = await supabaseAdmin
      .from("students")
      .select("id, company_id")
      .eq("id", data.studentId)
      .single();

    if (findErr || !student) throw new Response("Aluno não encontrado.", { status: 404 });

    // Only update company_id — never touch coach_id
    const { error } = await supabaseAdmin
      .from("students")
      .update({ company_id: data.companyId })
      .eq("id", data.studentId);

    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

// ── removeStudentFromCompany ──────────────────────────────────────────────────

const removeStudentSchema = z.object({
  studentId: z.string().uuid(),
});

export const removeStudentFromCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeStudentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertGlobalAdmin(context.userId);

    // Verify student exists
    const { data: student, error: findErr } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("id", data.studentId)
      .single();

    if (findErr || !student) throw new Response("Aluno não encontrado.", { status: 404 });

    // Set company_id to null — never touch coach_id
    const { error } = await supabaseAdmin
      .from("students")
      .update({ company_id: null })
      .eq("id", data.studentId);

    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });
