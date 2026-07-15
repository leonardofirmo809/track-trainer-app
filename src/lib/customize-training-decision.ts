// Pure, dependency-free by design — imported both by company-permissions.server.ts
// (runtime) and by its unit test (which can't resolve the "@/" alias or touch
// Supabase without a bundler). Keep this file free of imports.

export interface CustomizeTrainingContext {
  isOriginalCoach: boolean;
  isGlobalAdmin: boolean;
  hasCompany: boolean;
  companyActive: boolean;
  memberRole: "owner" | "admin" | "coach" | null;
  canManageTraining: boolean;
}

/**
 * Pure decision for the "Personalizar" rule. Precedence: original coach >
 * global admin > (must have an active-company membership, then owner/admin
 * OR can_manage_training). canCustomizeStudentTraining in
 * company-permissions.server.ts is the only production caller — it
 * short-circuits on the first two conditions before ever touching
 * company_members/companies, so this function is exercised end-to-end only
 * for the company-membership branch there. It's still unit-tested for every
 * branch (including isOriginalCoach/isGlobalAdmin) so the precedence itself
 * stays covered if that short-circuit is ever refactored away.
 */
export function canCustomizeStudentTrainingFromContext(ctx: CustomizeTrainingContext): boolean {
  if (ctx.isOriginalCoach) return true;
  if (ctx.isGlobalAdmin) return true;
  if (!ctx.hasCompany || !ctx.companyActive || ctx.memberRole === null) return false;
  return ctx.memberRole === "owner" || ctx.memberRole === "admin" || ctx.canManageTraining === true;
}
