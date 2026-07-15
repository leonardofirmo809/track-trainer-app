// Pure, dependency-free by design — imported both by invites.functions.ts
// (runtime) and by its unit test (which can't resolve the "@/" alias or
// touch Supabase without a bundler). Keep this file free of imports.

// Fallback false covers invites created before can_manage_students/
// can_manage_training existed on coach_invites (column is NULL there).
export function resolveInvitePermissions(invite: {
  can_manage_students: boolean | null | undefined;
  can_manage_training: boolean | null | undefined;
}): { can_manage_students: boolean; can_manage_training: boolean } {
  return {
    can_manage_students: invite.can_manage_students ?? false,
    can_manage_training: invite.can_manage_training ?? false,
  };
}
