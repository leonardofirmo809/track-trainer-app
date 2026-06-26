-- Fase 2I (risco 3): policies ALL de tests e training_plans passam a exigir
-- companies.status = 'active'. Empresa inativa não passa em USING/WITH CHECK de escrita.
-- Não altera policies SELECT, runner, coach dono do teste/plano, nem admin global.

-- ── tests ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "company member manages tests" ON public.tests;

CREATE POLICY "company member manages tests"
  ON public.tests FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      JOIN public.companies co ON co.id = s.company_id
      WHERE s.id = tests.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND co.status = 'active'
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      JOIN public.companies co ON co.id = s.company_id
      WHERE s.id = tests.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND co.status = 'active'
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  );

-- ── training_plans ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "company member manages plans" ON public.training_plans;

CREATE POLICY "company member manages plans"
  ON public.training_plans FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      JOIN public.companies co ON co.id = s.company_id
      WHERE s.id = training_plans.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND co.status = 'active'
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      JOIN public.companies co ON co.id = s.company_id
      WHERE s.id = training_plans.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND co.status = 'active'
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  );
