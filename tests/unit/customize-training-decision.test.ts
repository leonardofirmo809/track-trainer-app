// Run with: node --test tests/unit
// Pure-logic regression test for the "Personalizar" permission rule fixed in
// P3 (canCustomizeStudentTraining used to let any coach role in the company
// customize any student's plan, ignoring can_manage_training — a restricted
// coach could reach another coach's student via a direct URL). No Supabase/DB
// involved; see company-permissions.server.ts for how real context is built.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canCustomizeStudentTrainingFromContext } from "../../src/lib/customize-training-decision.ts";

const base = {
  isOriginalCoach: false,
  isGlobalAdmin: false,
  hasCompany: true,
  companyActive: true,
  memberRole: null as "owner" | "admin" | "coach" | null,
  canManageTraining: false,
};

test("global admin can always customize", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, isGlobalAdmin: true, memberRole: null }), true);
});

test("owner of the student's active company can customize", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, memberRole: "owner" }), true);
});

test("admin (company role) of the student's active company can customize", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, memberRole: "admin" }), true);
});

test("the student's original coach can customize", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, isOriginalCoach: true, memberRole: null }), true);
});

test("coach with can_manage_training=true can customize another coach's student in the same company", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, memberRole: "coach", canManageTraining: true }), true);
});

test("restricted coach (can_manage_training=false) who isn't the original coach is blocked", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, memberRole: "coach", canManageTraining: false }), false);
});

test("runner/student (no company membership at all) is blocked", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, memberRole: null, canManageTraining: false }), false);
});

test("user with no relationship to the student is blocked", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, hasCompany: false, memberRole: null }), false);
});

// canCustomizeStudentTraining (company-permissions.server.ts) scopes the
// company_members lookup by the STUDENT's company_id, so a user from another
// company simply has no membership row there — memberRole is null exactly
// like "no relationship". Cross-tenant isolation is enforced by that DB scoping,
// not by this pure decision function, but the decision here still correctly
// rejects the "no membership in this company" case either way.
test("cross-tenant coach (member of a different company) is blocked", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, memberRole: null, canManageTraining: false }), false);
});

test("inactive company blocks even an owner-role member", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, companyActive: false, memberRole: "owner" }), false);
});

test("inactive company blocks even can_manage_training=true", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, companyActive: false, memberRole: "coach", canManageTraining: true }), false);
});

test("original coach bypasses even an inactive company (matches production short-circuit before the company lookup)", () => {
  assert.equal(canCustomizeStudentTrainingFromContext({ ...base, isOriginalCoach: true, companyActive: false, memberRole: null }), true);
});
