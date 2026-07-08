import { supabase } from "@/integrations/supabase/client";

/**
 * Builds a PostgREST `.or()` filter that scopes a `students` query to rows the
 * current user should ever see: students they coach directly, plus the roster
 * of any company they belong to. RLS is still the real enforcement boundary —
 * this is a defense-in-depth filter so a future RLS regression on `students`
 * degrades to "own company" instead of "every company".
 */
export async function getStudentScopeFilter(userId: string): Promise<string> {
  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId);

  const companyIds = (memberships ?? []).map((m) => m.company_id);
  if (companyIds.length === 0) return `coach_id.eq.${userId}`;
  return `coach_id.eq.${userId},company_id.in.(${companyIds.join(",")})`;
}
