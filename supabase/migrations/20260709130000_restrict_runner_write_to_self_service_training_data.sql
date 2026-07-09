-- FASE 1B da auditoria geral (2026-07-09, pós-push de 20260709120000): fecha
-- uma brecha de integridade encontrada nas policies de UPDATE/DELETE do
-- corredor (runner) em training_plans e tests, criadas em 20260610134153.
--
-- Problema — "runner updates/deletes own plans/tests":
--   USING (e, no caso do UPDATE, WITH CHECK) só verificavam que o student_id
--   do registro pertence ao próprio corredor (students.user_id = auth.uid()).
--   Não havia nenhuma checagem de coach_id. A policy de INSERT irmã
--   ("runner inserts own plans/tests") já exige coach_id IS NULL — ou seja, o
--   próprio backend usa coach_id IS NULL como o sinal de "plano/teste
--   autocriado pelo corredor (fluxo de autoatendimento)" vs. coach_id
--   preenchido = "criado pelo treinador". O UPDATE/DELETE não replicava essa
--   mesma checagem.
--
--   Na prática, um corredor autenticado podia — via chamada direta ao
--   Supabase (não há tela na aplicação que exponha isto; toda escrita do
--   app passa por server functions com supabaseAdmin, que já filtram por
--   coach_id/company corretamente) — alterar ou apagar um training_plan ou
--   test que o PRÓPRIO treinador dele havia criado: reescrever o payload do
--   plano, mudar status/datas, reescrever resultado/zonas de um teste, ou
--   até reatribuir coach_id para desvincular o registro do treinador.
--   Não há risco cross-tenant/cross-empresa aqui (USING já ancorava
--   firmemente em students.user_id = auth.uid(), e cada corredor só tem uma
--   linha em students via students_user_id_unique) — o risco é de
--   integridade dos dados que o próprio treinador do corredor produziu.
--
-- Correção: UPDATE e DELETE passam a exigir, tanto quanto o INSERT já exige,
-- que coach_id seja NULL — ou seja, o corredor só pode alterar/apagar
-- registros de autoatendimento (que ele mesmo criou, direta ou
-- indiretamente via app), nunca um registro com treinador atribuído. No
-- UPDATE, o WITH CHECK repete a mesma exigência sobre a linha resultante,
-- então o corredor também não consegue preencher coach_id num update (o que
-- disfarçaria/desvincularia um plano próprio) nem mover o registro para o
-- student_id de outro aluno (o EXISTS é reavaliado sobre a linha nova).
--
-- Não altera: SELECT, INSERT, nem nenhuma policy de students, coach, admin
-- ou company member — apenas as 4 policies de runner listadas abaixo.
-- Não é aplicada em nenhum banco por este commit.

-- ── training_plans: UPDATE ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "runner updates own plans" ON public.training_plans;

CREATE POLICY "runner updates own plans"
  ON public.training_plans FOR UPDATE TO authenticated
  USING (
    training_plans.coach_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = training_plans.student_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    training_plans.coach_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = training_plans.student_id AND s.user_id = auth.uid()
    )
  );

-- ── training_plans: DELETE ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "runner deletes own plans" ON public.training_plans;

CREATE POLICY "runner deletes own plans"
  ON public.training_plans FOR DELETE TO authenticated
  USING (
    training_plans.coach_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = training_plans.student_id AND s.user_id = auth.uid()
    )
  );

-- ── tests: UPDATE ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "runner updates own tests" ON public.tests;

CREATE POLICY "runner updates own tests"
  ON public.tests FOR UPDATE TO authenticated
  USING (
    tests.coach_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = tests.student_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    tests.coach_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = tests.student_id AND s.user_id = auth.uid()
    )
  );

-- ── tests: DELETE ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "runner deletes own tests" ON public.tests;

CREATE POLICY "runner deletes own tests"
  ON public.tests FOR DELETE TO authenticated
  USING (
    tests.coach_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = tests.student_id AND s.user_id = auth.uid()
    )
  );
