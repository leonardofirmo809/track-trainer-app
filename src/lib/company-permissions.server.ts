import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Checks if userId can view or manage training data for a given student.
 * Allowed: global admin, the student's original coach, company member with
 * owner/admin/can_manage_training in an active company.
 * When allowRunner=true, also allows the runner who owns the student profile.
 * Returns the student row on success; throws 403/404 otherwise.
 */
export async function assertCanManageStudentTraining(
  studentId: string,
  userId: string,
  allowRunner = false,
): Promise<{ id: string; coach_id: string | null; user_id: string | null; company_id: string | null }> {
  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("id, coach_id, user_id, company_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!student) throw new Response("Aluno não encontrado", { status: 404 });

  if (student.coach_id === userId) return student;
  if (allowRunner && student.user_id === userId) return student;

  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return student;

  if (student.company_id) {
    const [{ data: member }, { data: company }] = await Promise.all([
      supabaseAdmin
        .from("company_members")
        .select("role, can_manage_training")
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
      if (member.role === "owner" || member.role === "admin" || member.can_manage_training) {
        return student;
      }
    }
  }

  throw new Response("Forbidden", { status: 403 });
}

// company_role hoje só tem estes 3 valores (ver migration 20260626210000 e
// src/integrations/supabase/types.ts) — todos são papéis de treino (dono/gestor/coach
// da própria academia). Listado explicitamente (em vez de "qualquer membro existe")
// para que, se um papel não-treinador (ex.: vendedor/atendimento/suporte) for
// adicionado no futuro, ele NÃO ganhe acesso a personalizar treinos por acidente.
const TRAINING_STAFF_ROLES = ["owner", "admin", "coach"] as const;

/**
 * Returns true if userId may customize (rearrange/edit sessions of) an existing
 * training plan belonging to studentId. Deliberately looser than
 * assertCanManageStudentTraining: any active member of the student's company
 * with a training-staff role (TRAINING_STAFF_ROLES) qualifies, regardless of the
 * per-coach can_manage_training flag — that flag still gates generating/administering
 * plans elsewhere. Never allows the runner who owns the student profile, and never
 * allows a non-training-staff role even if one is added to company_role later.
 * This is the single source of truth for the "Personalizar" feature — both the
 * server functions and the frontend's canCustomizeTraining flag must call this.
 */
export async function canCustomizeStudentTraining(studentId: string, userId: string): Promise<boolean> {
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("coach_id, company_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return false;

  if (student.coach_id === userId) return true;

  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return true;

  if (!student.company_id) return false;

  const [{ data: member }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from("company_members")
      .select("role")
      .eq("company_id", student.company_id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("companies")
      .select("status")
      .eq("id", student.company_id)
      .maybeSingle(),
  ]);

  if (!member || company?.status !== "active") return false;
  return (TRAINING_STAFF_ROLES as readonly string[]).includes(member.role);
}

/**
 * Throws 403/404 using the same rule as canCustomizeStudentTraining above.
 * Use only for the "Personalizar" flow (getPlanCustomization, savePlanCustomization,
 * savePlanWorkoutOverrides) — do not use for other training-management endpoints.
 */
export async function assertCanCustomizeStudentTraining(
  studentId: string,
  userId: string,
): Promise<{ id: string; coach_id: string | null; user_id: string | null; company_id: string | null }> {
  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("id, coach_id, user_id, company_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!student) throw new Response("Aluno não encontrado", { status: 404 });

  if (!(await canCustomizeStudentTraining(studentId, userId))) {
    throw new Response("Forbidden", { status: 403 });
  }
  return student;
}

/**
 * Throws 403 if userId cannot manage students in companyId.
 * Allowed: global admin, company owner/admin, coach with can_manage_students=true.
 */
export async function assertCanManageStudents(companyId: string, userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return;

  const [{ data: member }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from("company_members")
      .select("role, can_manage_students")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single(),
    supabaseAdmin
      .from("companies")
      .select("status")
      .eq("id", companyId)
      .single(),
  ]);

  if (!member || company?.status !== "active") throw new Response("Forbidden", { status: 403 });
  if (member.role === "owner" || member.role === "admin") return;
  if (member.can_manage_students) return;
  throw new Response("Forbidden: sem permissão para gerenciar alunos", { status: 403 });
}

/**
 * Throws 403 if userId cannot manage training/technical data in companyId.
 * Allowed: global admin, company owner/admin, coach with can_manage_training=true.
 */
export async function assertCanManageTraining(companyId: string, userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return;

  const [{ data: member }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from("company_members")
      .select("role, can_manage_training")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single(),
    supabaseAdmin
      .from("companies")
      .select("status")
      .eq("id", companyId)
      .single(),
  ]);

  if (!member || company?.status !== "active") throw new Response("Forbidden", { status: 403 });
  if (member.role === "owner" || member.role === "admin") return;
  if (member.can_manage_training) return;
  throw new Response("Forbidden: sem permissão para gerenciar treinos", { status: 403 });
}
