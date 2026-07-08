/**
 * Multi-tenant RLS verification script for 8020Pace.
 *
 * Creates two throwaway companies (A, B), one coach + one student per company,
 * one standalone runner, then signs in as each user with the real anon client
 * (so RLS actually applies, exactly like the browser) and asserts cross-tenant
 * isolation. Cleans up everything it created, even on failure.
 *
 * Requires (never hardcode these — read from env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (setup/teardown only — never used for assertions)
 *   SUPABASE_PUBLISHABLE_KEY    (anon key — used for the actual RLS-scoped queries)
 *
 * Run: node scripts/verify-multitenant-rls.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error(
    "Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "verify-rls-" + crypto.randomUUID();
const results = [];
const cleanup = { userIds: [], companyIds: [] };

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function createUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  cleanup.userIds.push(data.user.id);
  return data.user.id;
}

async function signIn(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn(${email}): ${error.message}`);
  return client;
}

async function main() {
  const stamp = Date.now();

  // ── Fixtures ──────────────────────────────────────────────────────────────
  const { data: companyA } = await admin.from("companies").insert({ name: `QA Company A ${stamp}` }).select("id").single();
  const { data: companyB } = await admin.from("companies").insert({ name: `QA Company B ${stamp}` }).select("id").single();
  cleanup.companyIds.push(companyA.id, companyB.id);

  const coachAId = await createUser(`qa-coach-a-${stamp}@example.invalid`);
  const coachBId = await createUser(`qa-coach-b-${stamp}@example.invalid`);
  const runner1Id = await createUser(`qa-runner-1-${stamp}@example.invalid`);
  const runner2Id = await createUser(`qa-runner-2-${stamp}@example.invalid`);
  const globalAdminId = await createUser(`qa-admin-${stamp}@example.invalid`);

  // Plain company members (no can_manage_students / can_manage_training) —
  // the exact case that used to leak the whole company roster.
  await admin.from("company_members").insert([
    { company_id: companyA.id, user_id: coachAId, role: "coach", can_manage_students: false, can_manage_training: false },
    { company_id: companyB.id, user_id: coachBId, role: "coach", can_manage_students: false, can_manage_training: false },
  ]);

  await admin.from("user_roles").insert({ user_id: globalAdminId, role: "admin" });

  const { data: studentA } = await admin
    .from("students")
    .insert({ full_name: `Aluno QA A ${stamp}`, coach_id: coachAId, company_id: companyA.id })
    .select("id, coach_id")
    .single();
  const { data: studentB } = await admin
    .from("students")
    .insert({ full_name: `Aluno QA B ${stamp}`, coach_id: coachBId, company_id: companyB.id })
    .select("id, coach_id")
    .single();
  // Student in company A NOT linked to coachA (created by another coach/admin) —
  // proves a plain coach without can_manage_students doesn't see the whole roster.
  const { data: studentAUnlinked } = await admin
    .from("students")
    .insert({ full_name: `Aluno QA A (unlinked) ${stamp}`, coach_id: coachBId, company_id: companyA.id })
    .select("id")
    .single();

  await admin.from("user_roles").insert({ user_id: runner1Id, role: "runner" });
  await admin.from("user_roles").insert({ user_id: runner2Id, role: "runner" });
  const { data: runnerStudent1 } = await admin
    .from("students")
    .insert({ full_name: `Runner QA 1 ${stamp}`, user_id: runner1Id })
    .select("id")
    .single();
  const { data: runnerStudent2 } = await admin
    .from("students")
    .insert({ full_name: `Runner QA 2 ${stamp}`, user_id: runner2Id })
    .select("id")
    .single();

  // ── Assertions ────────────────────────────────────────────────────────────

  // 1. Coach A must not see Company B's student.
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { data } = await client.from("students").select("id, company_id");
    const ids = (data ?? []).map((s) => s.id);
    record(
      "Coach A não vê aluno da Empresa B",
      !ids.includes(studentB.id),
      `visible=${JSON.stringify(ids)}`,
    );
    record(
      "Coach A (sem can_manage_students) vê só o próprio aluno vinculado, não o roster inteiro da própria empresa",
      ids.includes(studentA.id) && !ids.includes(studentAUnlinked.id),
      `visible=${JSON.stringify(ids)}`,
    );
  }

  // 2. Coach B must not see Company A's students.
  {
    const client = await signIn(`qa-coach-b-${stamp}@example.invalid`);
    const { data } = await client.from("students").select("id");
    const ids = (data ?? []).map((s) => s.id);
    record(
      "Coach B não vê alunos da Empresa A",
      !ids.includes(studentA.id) && !ids.includes(studentAUnlinked.id),
      `visible=${JSON.stringify(ids)}`,
    );
  }

  // 3. Runner 1 must not see runner 2's student data (and vice versa).
  {
    const client = await signIn(`qa-runner-1-${stamp}@example.invalid`);
    const { data } = await client.from("students").select("id");
    const ids = (data ?? []).map((s) => s.id);
    record(
      "Runner 1 não vê o aluno do Runner 2",
      ids.includes(runnerStudent1.id) && !ids.includes(runnerStudent2.id),
      `visible=${JSON.stringify(ids)}`,
    );
  }

  // 4. Global admin sees everything.
  {
    const client = await signIn(`qa-admin-${stamp}@example.invalid`);
    const { data } = await client.from("students").select("id");
    const ids = (data ?? []).map((s) => s.id);
    const expected = [studentA.id, studentB.id, studentAUnlinked.id, runnerStudent1.id, runnerStudent2.id];
    record(
      "Admin global vê alunos de todas as empresas",
      expected.every((id) => ids.includes(id)),
      `visible=${ids.length}/${expected.length} esperados`,
    );
  }

  // 5. training_plans / tests follow the same isolation (spot-check via coach A).
  {
    const { data: planA } = await admin
      .from("training_plans")
      .insert({ student_id: studentA.id, coach_id: coachAId, plan_type: "10km", status: "ativa", payload: {} })
      .select("id")
      .single();
    const { data: planB } = await admin
      .from("training_plans")
      .insert({ student_id: studentB.id, coach_id: coachBId, plan_type: "10km", status: "ativa", payload: {} })
      .select("id")
      .single();

    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { data } = await client.from("training_plans").select("id");
    const ids = (data ?? []).map((p) => p.id);
    record(
      "Coach A não vê training_plans da Empresa B",
      ids.includes(planA.id) && !ids.includes(planB.id),
      `visible=${JSON.stringify(ids)}`,
    );
  }
}

async function teardown() {
  for (const id of cleanup.userIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  for (const id of cleanup.companyIds) {
    // students/training_plans/tests referencing this company are cleaned up
    // via ON DELETE CASCADE / SET NULL where applicable; delete leftovers explicitly.
    await admin.from("students").delete().eq("company_id", id).catch(() => {});
    await admin.from("companies").delete().eq("id", id).catch(() => {});
  }
}

try {
  await main();
} catch (err) {
  console.error("ERROR:", err.message);
  process.exitCode = 1;
} finally {
  await teardown();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) process.exitCode = 1;
