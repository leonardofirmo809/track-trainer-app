import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Throws 403 if userId cannot manage students in companyId.
 * Allowed: global admin, company owner/admin, coach with can_manage_students=true.
 */
export async function assertCanManageStudents(companyId: string, userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return;

  const { data: member } = await supabaseAdmin
    .from("company_members")
    .select("role, can_manage_students")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .single();

  if (!member) throw new Response("Forbidden", { status: 403 });
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

  const { data: member } = await supabaseAdmin
    .from("company_members")
    .select("role, can_manage_training")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .single();

  if (!member) throw new Response("Forbidden", { status: 403 });
  if (member.role === "owner" || member.role === "admin") return;
  if (member.can_manage_training) return;
  throw new Response("Forbidden: sem permissão para gerenciar treinos", { status: 403 });
}
