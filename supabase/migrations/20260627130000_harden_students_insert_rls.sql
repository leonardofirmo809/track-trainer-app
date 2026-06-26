-- Fase 2H (bug 3): fortifica policy de INSERT em students.
-- Antes: apenas coach_id = auth.uid() era verificado, permitindo inserir aluno
-- com qualquer company_id via chamada direta à API.
-- Agora: se company_id não for null, o usuário deve ser membro ativo da empresa
-- com role owner/admin ou can_manage_students = true.

DROP POLICY IF EXISTS "coach inserts own students" ON public.students;

CREATE POLICY "coach inserts own students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND (
      -- Sem empresa: fluxo legado e coaches sem empresa continuam funcionando
      company_id IS NULL
      -- Admin global: pode inserir em qualquer empresa
      OR public.has_role(auth.uid(), 'admin')
      -- Membro ativo da empresa com permissão para gerenciar alunos
      OR EXISTS (
        SELECT 1
        FROM public.company_members cm
        JOIN public.companies co ON co.id = cm.company_id
        WHERE cm.company_id = company_id
          AND cm.user_id = auth.uid()
          AND co.status = 'active'
          AND (cm.role IN ('owner', 'admin') OR cm.can_manage_students = true)
      )
    )
  );
