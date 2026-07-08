import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canCustomizeStudentTraining } from "@/lib/company-permissions.server";

// ── listAccessibleCompanies ───────────────────────────────────────────────────
// Returns companies where the current user can create students.
// Admin global: all active companies.
// Coach: companies where they are owner/admin, or have can_manage_students=true.

export const listAccessibleCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (isAdmin) {
      const { data, error } = await supabaseAdmin
        .from("companies")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw new Response(error.message, { status: 500 });
      return data ?? [];
    }

    // Non-admin: check company memberships
    const { data: memberships, error: mErr } = await supabaseAdmin
      .from("company_members")
      .select("company_id, role, can_manage_students")
      .eq("user_id", userId);

    if (mErr) throw new Response(mErr.message, { status: 500 });

    const accessibleIds = (memberships ?? [])
      .filter((m) => m.role === "owner" || m.role === "admin" || m.can_manage_students)
      .map((m) => m.company_id);

    if (accessibleIds.length === 0) return [];

    const { data: companies, error: cErr } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .in("id", accessibleIds)
      .eq("status", "active")
      .order("name");

    if (cErr) throw new Response(cErr.message, { status: 500 });
    return companies ?? [];
  });

// ── getStudentPermissions ─────────────────────────────────────────────────────
// Returns what the current user can edit for a given student.
// Cadastral: full_name, email, phone, birth_date, gender
// Training:  goal, level, target_distance, injury_history, notes

export const getStudentPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ studentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Mesma fonte de permissão usada pelo backend do fluxo "Personalizar"
    // (getPlanCustomization/savePlanCustomization) — mantém frontend e backend em sincronia.
    const canCustomizeTraining = await canCustomizeStudentTraining(data.studentId, userId);

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin) return { canEditCadastral: true, canEditTraining: true, canCustomizeTraining };

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("coach_id, company_id")
      .eq("id", data.studentId)
      .single();

    if (!student) return { canEditCadastral: false, canEditTraining: false, canCustomizeTraining };

    // No company: only the assigned coach can edit
    if (!student.company_id) {
      const isCoach = student.coach_id === userId;
      return { canEditCadastral: isCoach, canEditTraining: isCoach, canCustomizeTraining };
    }

    // Has company: check membership AND active company status
    const [{ data: member }, { data: company }] = await Promise.all([
      supabaseAdmin
        .from("company_members")
        .select("role, can_manage_students, can_manage_training")
        .eq("company_id", student.company_id)
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("companies")
        .select("status")
        .eq("id", student.company_id)
        .single(),
    ]);

    if (!member || company?.status !== "active") return { canEditCadastral: false, canEditTraining: false, canCustomizeTraining };

    const isAdminRole = member.role === "owner" || member.role === "admin";
    return {
      canEditCadastral: isAdminRole || member.can_manage_students,
      canEditTraining: isAdminRole || member.can_manage_training,
      canCustomizeTraining,
    };
  });

// ── updateStudent ─────────────────────────────────────────────────────────────

const updateStudentSchema = z.object({
  studentId: z.string().uuid(),
  updateCadastral: z.boolean().default(false),
  updateTraining: z.boolean().default(false),
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  goal: z.string().trim().max(500).optional(),
  level: z.enum(["iniciante", "intermediario", "avancado"]).optional(),
  targetDistance: z.enum(["5km", "10km", "21km", "42km"]).optional(),
  injuryHistory: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateStudentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("coach_id, company_id")
      .eq("id", data.studentId)
      .single();

    if (!student) throw new Response("Aluno não encontrado.", { status: 404 });

    let canEditCadastral = false;
    let canEditTraining = false;

    if (isAdmin) {
      canEditCadastral = true;
      canEditTraining = true;
    } else if (!student.company_id) {
      const isCoach = student.coach_id === userId;
      canEditCadastral = isCoach;
      canEditTraining = isCoach;
    } else {
      const [{ data: member }, { data: company }] = await Promise.all([
        supabaseAdmin
          .from("company_members")
          .select("role, can_manage_students, can_manage_training")
          .eq("company_id", student.company_id)
          .eq("user_id", userId)
          .single(),
        supabaseAdmin
          .from("companies")
          .select("status")
          .eq("id", student.company_id)
          .single(),
      ]);

      if (member && company?.status === "active") {
        const isAdminRole = member.role === "owner" || member.role === "admin";
        canEditCadastral = isAdminRole || member.can_manage_students;
        canEditTraining = isAdminRole || member.can_manage_training;
      }
    }

    const patch: Record<string, unknown> = {};

    if (data.updateCadastral) {
      if (!canEditCadastral) throw new Response("Forbidden: sem permissão para editar dados cadastrais.", { status: 403 });
      if (data.fullName !== undefined) patch.full_name = data.fullName;
      if (data.email !== undefined) patch.email = data.email || null;
      if (data.phone !== undefined) patch.phone = data.phone || null;
      if (data.birthDate !== undefined) patch.birth_date = data.birthDate || null;
      if (data.gender !== undefined) patch.gender = data.gender || null;
    }

    if (data.updateTraining) {
      if (!canEditTraining) throw new Response("Forbidden: sem permissão para editar dados técnicos.", { status: 403 });
      if (data.goal !== undefined) patch.goal = data.goal || null;
      if (data.level !== undefined) patch.level = data.level || null;
      if (data.targetDistance !== undefined) patch.target_distance = data.targetDistance || null;
      if (data.injuryHistory !== undefined) patch.injury_history = data.injuryHistory || null;
      if (data.notes !== undefined) patch.notes = data.notes || null;
    }

    if (Object.keys(patch).length === 0) return { ok: true as const };

    const { error } = await supabaseAdmin
      .from("students")
      .update(patch)
      .eq("id", data.studentId);

    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

// ── createStudent ─────────────────────────────────────────────────────────────

const createStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional(),
  targetDistance: z.enum(["5km", "10km", "21km", "42km"]).optional(),
  level: z.enum(["iniciante", "intermediario", "avancado"]).optional(),
  notes: z.string().trim().max(1000).optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  goal: z.string().optional(),
  injuryHistory: z.string().optional(),
  companyId: z.string().uuid().optional(),
});

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createStudentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Permission check when a company is specified
    if (data.companyId) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (!isAdmin) {
        const [{ data: member }, { data: company }] = await Promise.all([
          supabaseAdmin
            .from("company_members")
            .select("role, can_manage_students")
            .eq("company_id", data.companyId)
            .eq("user_id", userId)
            .single(),
          supabaseAdmin
            .from("companies")
            .select("status")
            .eq("id", data.companyId)
            .single(),
        ]);

        if (!member || company?.status !== "active")
          throw new Response("Forbidden: não é membro de uma empresa ativa.", { status: 403 });
        if (
          member.role !== "owner" &&
          member.role !== "admin" &&
          !member.can_manage_students
        ) {
          throw new Response("Forbidden: sem permissão para criar alunos nesta empresa.", { status: 403 });
        }
      }
    }

    const { data: student, error } = await supabaseAdmin
      .from("students")
      .insert({
        coach_id: userId,
        company_id: data.companyId ?? null,
        full_name: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        target_distance: (data.targetDistance as "5km" | "10km" | "21km" | "42km") ?? null,
        level: (data.level as "iniciante" | "intermediario" | "avancado") ?? null,
        notes: data.notes || null,
        birth_date: data.birthDate || null,
        gender: data.gender || null,
        goal: data.goal || null,
        injury_history: data.injuryHistory || null,
      })
      .select("id")
      .single();

    if (error) throw new Response(error.message, { status: 500 });
    return student;
  });
