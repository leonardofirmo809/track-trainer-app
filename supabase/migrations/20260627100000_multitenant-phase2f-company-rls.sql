-- Fase 2F multiempresa — RLS policies para acesso por empresa.
-- Aditiva: não altera nem remove nenhuma policy existente.
-- Sem colunas novas: o acesso é derivado de students.company_id.

-- ── students ──────────────────────────────────────────────────────────────────
-- Qualquer membro de uma empresa vê os alunos dessa empresa.
-- Usa is_company_member (SECURITY DEFINER) para evitar recursão de RLS.

CREATE POLICY "company member sees students"
  ON public.students FOR SELECT TO authenticated
  USING (
    company_id IS NOT NULL
    AND public.is_company_member(auth.uid(), company_id)
  );

-- ── tests ─────────────────────────────────────────────────────────────────────
-- Qualquer membro vê os testes dos alunos da empresa.

CREATE POLICY "company member sees tests"
  ON public.tests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = tests.student_id
        AND s.company_id IS NOT NULL
        AND public.is_company_member(auth.uid(), s.company_id)
    )
  );

-- Owner/admin e coach com can_manage_training podem inserir, atualizar e deletar testes.
-- O JOIN em company_members só retorna a linha do próprio usuário (RLS: "user sees own membership"),
-- portanto cm.user_id = auth.uid() é seguro e não causa recursão.

CREATE POLICY "company member manages tests"
  ON public.tests FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      WHERE s.id = tests.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      WHERE s.id = tests.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  );

-- ── training_plans ────────────────────────────────────────────────────────────
-- Qualquer membro vê as planilhas dos alunos da empresa.

CREATE POLICY "company member sees plans"
  ON public.training_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = training_plans.student_id
        AND s.company_id IS NOT NULL
        AND public.is_company_member(auth.uid(), s.company_id)
    )
  );

-- Owner/admin e coach com can_manage_training podem inserir, atualizar e deletar planilhas.

CREATE POLICY "company member manages plans"
  ON public.training_plans FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      WHERE s.id = training_plans.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.company_members cm ON cm.company_id = s.company_id
      WHERE s.id = training_plans.student_id
        AND s.company_id IS NOT NULL
        AND cm.user_id = auth.uid()
        AND (cm.role IN ('owner', 'admin') OR cm.can_manage_training = true)
    )
  );
