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
 * This script uses the SERVICE ROLE key to create and delete real rows
 * (companies/users/students/tests/training_plans) wherever SUPABASE_URL
 * points to. NEVER run it against a production project. As a safety net it
 * refuses to run unless ALLOW_RLS_WRITE_TESTS=true is set AND SUPABASE_URL
 * does not look like a known production hostname — see the guard below.
 *
 * Run: ALLOW_RLS_WRITE_TESTS=true node scripts/verify-multitenant-rls.mjs
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

// ── Safety guard: this script writes/deletes real rows with the service role
// key, bypassing RLS entirely for setup/teardown. Require an explicit opt-in
// so it can never run "by accident" just because envs happen to be exported
// in the shell (e.g. a leftover `SUPABASE_URL` from a prod deploy session).
if (process.env.ALLOW_RLS_WRITE_TESTS !== "true") {
  console.error(
    "Refusing to run: this script performs real writes/deletes with the " +
      "service role key (companies, users, students, tests, training_plans).\n" +
      "Set ALLOW_RLS_WRITE_TESTS=true explicitly to confirm SUPABASE_URL " +
      `points to a local/staging project you intend to test, not production.\n` +
      `Current SUPABASE_URL: ${SUPABASE_URL}`,
  );
  process.exit(1);
}

// Known 8020Pace production project ref (see supabase/config.toml /
// src/integrations/supabase/public-config.ts). Refuse even with the opt-in
// flag set — this is a hard stop, not just a warning, to protect prod data.
const PRODUCTION_PROJECT_REF = "eyivvedcwecrgpuijoyy";
if (SUPABASE_URL.includes(PRODUCTION_PROJECT_REF)) {
  console.error(
    `Refusing to run: SUPABASE_URL points to the known PRODUCTION project ` +
      `(${PRODUCTION_PROJECT_REF}). This script must only run against a ` +
      "local or staging Supabase project.",
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
  // Company A staff member with can_manage_students=true but no elevated role —
  // used to prove students INSERT is scoped to the membership's OWN company,
  // not "any active company the user has this flag in" (the tautology bug).
  const staffAId = await createUser(`qa-staff-a-${stamp}@example.invalid`);

  // Plain company members (no can_manage_students / can_manage_training) —
  // the exact case that used to leak the whole company roster.
  await admin.from("company_members").insert([
    { company_id: companyA.id, user_id: coachAId, role: "coach", can_manage_students: false, can_manage_training: false },
    { company_id: companyB.id, user_id: coachBId, role: "coach", can_manage_students: false, can_manage_training: false },
    { company_id: companyA.id, user_id: staffAId, role: "coach", can_manage_students: true, can_manage_training: false },
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

  // 6. Coach A tenta inserir teste falso em aluno da Empresa B (cross-tenant INSERT).
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client
      .from("tests")
      .insert({ student_id: studentB.id, coach_id: coachAId, test_type: "3km", test_date: "2026-01-01" });
    record(
      "Coach A NÃO consegue inserir teste falso em aluno da Empresa B",
      !!error,
      error ? `bloqueado (${error.code ?? error.message})` : "INSERIU SEM ERRO — RLS QUEBRADA",
    );
  }

  // 7. Coach A tenta inserir training_plan falso em aluno da Empresa B (cross-tenant INSERT).
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client
      .from("training_plans")
      .insert({ student_id: studentB.id, coach_id: coachAId, plan_type: "10km", status: "ativa", payload: {} });
    record(
      "Coach A NÃO consegue inserir training_plan falso em aluno da Empresa B",
      !!error,
      error ? `bloqueado (${error.code ?? error.message})` : "INSERIU SEM ERRO — RLS QUEBRADA",
    );
  }

  // 8. Sanity: Coach A consegue inserir teste no próprio aluno (fluxo legítimo preservado).
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client
      .from("tests")
      .insert({ student_id: studentA.id, coach_id: coachAId, test_type: "3km", test_date: "2026-01-01" });
    record(
      "Coach A consegue inserir teste no próprio aluno (fluxo legítimo preservado)",
      !error,
      error ? `error=${error.message}` : "ok",
    );
  }

  // 9. Coach A tenta mover o próprio aluno para a Empresa B (cross-tenant UPDATE).
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client.from("students").update({ company_id: companyB.id }).eq("id", studentA.id);
    record(
      "Coach A NÃO consegue mover o próprio aluno para a Empresa B",
      !!error,
      error ? `bloqueado (${error.code ?? error.message})` : "ATUALIZOU SEM ERRO — RLS QUEBRADA",
    );
  }

  // 10. Coach A tenta reatribuir user_id do próprio aluno (sequestro de vínculo com corredor).
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client.from("students").update({ user_id: runner2Id }).eq("id", studentA.id);
    record(
      "Coach A NÃO consegue reatribuir user_id do próprio aluno",
      !!error,
      error ? `bloqueado (${error.code ?? error.message})` : "ATUALIZOU SEM ERRO — RLS QUEBRADA",
    );
  }

  // 11. Sanity: Coach A consegue atualizar campo comum (full_name) do próprio aluno.
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client
      .from("students")
      .update({ full_name: `Aluno QA A ${stamp} (editado)` })
      .eq("id", studentA.id);
    record(
      "Coach A consegue editar campo comum do próprio aluno (fluxo legítimo preservado)",
      !error,
      error ? `error=${error.message}` : "ok",
    );
  }

  // 12. Coach A (plain member, sem can_manage_students) tenta inserir aluno
  //     com company_id da Empresa B — cross-tenant INSERT em students.
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client
      .from("students")
      .insert({ full_name: `Fake Student ${stamp}`, coach_id: coachAId, company_id: companyB.id });
    record(
      "Coach A NÃO consegue inserir aluno com company_id da Empresa B",
      !!error,
      error ? `bloqueado (${error.code ?? error.message})` : "INSERIU SEM ERRO — RLS QUEBRADA",
    );
  }

  // 13. Staff A (can_manage_students=true só na Empresa A) tenta inserir aluno
  //     com company_id da Empresa B. Isto é exatamente o cenário da tautologia:
  //     antes da correção, o EXISTS só confirmava "é can_manage_students de
  //     ALGUMA empresa ativa" (a própria Empresa A), sem checar que era a
  //     MESMA empresa do company_id sendo gravado (Empresa B) — então isto
  //     passava indevidamente. Agora deve ser bloqueado.
  {
    const client = await signIn(`qa-staff-a-${stamp}@example.invalid`);
    const { error } = await client
      .from("students")
      .insert({ full_name: `Fake Student via staff ${stamp}`, coach_id: staffAId, company_id: companyB.id });
    record(
      "Staff A (can_manage_students só na Empresa A) NÃO consegue inserir aluno com company_id da Empresa B",
      !!error,
      error ? `bloqueado (${error.code ?? error.message})` : "INSERIU SEM ERRO — RLS QUEBRADA (tautologia)",
    );
  }

  // 14. Sanity: Staff A insere aluno com company_id da PRÓPRIA Empresa A — permitido.
  {
    const client = await signIn(`qa-staff-a-${stamp}@example.invalid`);
    const { data, error } = await client
      .from("students")
      .insert({ full_name: `Aluno legítimo via staff ${stamp}`, coach_id: staffAId, company_id: companyA.id })
      .select("id")
      .single();
    record(
      "Staff A consegue inserir aluno na própria Empresa A (fluxo legítimo preservado)",
      !error && !!data,
      error ? `error=${error.message}` : "ok",
    );
  }

  // 15. Coach A tenta inserir aluno já vinculando user_id a uma conta arbitrária.
  //     Usa globalAdminId (não runner1Id/runner2Id) de propósito: esses dois já
  //     têm uma linha em students via students_user_id_unique, então um insert
  //     duplicado seria bloqueado pela constraint mesmo com RLS quebrada,
  //     mascarando o resultado do teste. globalAdminId nunca tem student
  //     associado, então isto isola exclusivamente o comportamento da RLS.
  {
    const client = await signIn(`qa-coach-a-${stamp}@example.invalid`);
    const { error } = await client
      .from("students")
      .insert({ full_name: `Fake Student user_id ${stamp}`, coach_id: coachAId, user_id: globalAdminId });
    record(
      "Coach A NÃO consegue inserir aluno com user_id arbitrário",
      !!error,
      error ? `bloqueado (${error.code ?? error.message})` : "INSERIU SEM ERRO — RLS QUEBRADA",
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
