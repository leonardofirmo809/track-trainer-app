// Run with: node --test tests/unit
// Pure-logic regression test for the coach-invite permission defaults fixed
// in P3 (invites.functions.ts used to hardcode can_manage_training=true for
// every coach invited into a company). No Supabase/DB involved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveInvitePermissions } from "../../src/lib/invite-permissions.ts";

test("invite with both permissions explicitly false stays false/false", () => {
  const result = resolveInvitePermissions({ can_manage_students: false, can_manage_training: false });
  assert.deepEqual(result, { can_manage_students: false, can_manage_training: false });
});

test("invite with can_manage_training=true is preserved", () => {
  const result = resolveInvitePermissions({ can_manage_students: false, can_manage_training: true });
  assert.deepEqual(result, { can_manage_students: false, can_manage_training: true });
});

test("invite with can_manage_students=true is preserved", () => {
  const result = resolveInvitePermissions({ can_manage_students: true, can_manage_training: false });
  assert.deepEqual(result, { can_manage_students: true, can_manage_training: false });
});

test("old invite predating these columns (null) falls back to false/false, never true", () => {
  const result = resolveInvitePermissions({ can_manage_students: null, can_manage_training: null });
  assert.deepEqual(result, { can_manage_students: false, can_manage_training: false });
});

test("invite with undefined fields falls back to false/false", () => {
  const result = resolveInvitePermissions({ can_manage_students: undefined, can_manage_training: undefined });
  assert.deepEqual(result, { can_manage_students: false, can_manage_training: false });
});
