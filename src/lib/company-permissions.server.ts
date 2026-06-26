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
