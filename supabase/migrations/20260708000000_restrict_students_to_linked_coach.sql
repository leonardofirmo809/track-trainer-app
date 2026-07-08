-- Fix: coach sem permissão elevada via ANY membership em uma empresa podia
-- ver o roster INTEIRO de alunos da empresa (policy "company member sees
-- students/tests/plans" checava apenas is_company_member(), sem olhar o
-- vínculo coach_id nem as flags can_manage_students/can_manage_training).
--
-- Regra correta: membro com role owner/admin OU can_manage_students=true OU
-- can_manage_training=true continua vendo o roster inteiro da empresa.
-- Coach comum (sem nenhuma dessas flags) só vê os alunos vinculados a ele
-- (students.coach_id = auth.uid()), mesmo dentro da própria empresa.
--
-- Nao afeta: admin global (has_role), runner (dono do proprio registro),
-- nem os coaches que já tinham coach_id = auth.uid() (continuam vendo).

-- ── students ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "company member sees students" ON public.students;

CREATE POLICY "company member sees students"
  ON public.students FOR SELECT TO authenticated
  USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.company_members cm
      JOIN public.companies co ON co.id = cm.company_id
      WHERE cm.company_id = students.company_id
        AND cm.user_id = auth.uid()
        AND co.status = 'active'
        AND (
          cm.role IN ('owner', 'admin')
          OR cm.can_manage_students = true
          OR cm.can_manage_training = true
          OR students.coach_id = auth.uid()
        )
    )
  );

-- ── tests ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "company member sees tests" ON public.tests;

CREATE POLICY "company member sees tests"
  ON public.tests FOR SELECT TO authenticated
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
        AND (
          cm.role IN ('owner', 'admin')
          OR cm.can_manage_students = true
          OR cm.can_manage_training = true
          OR s.coach_id = auth.uid()
        )
    )
  );

-- ── training_plans ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "company member sees plans" ON public.training_plans;

CREATE POLICY "company member sees plans"
  ON public.training_plans FOR SELECT TO authenticated
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
        AND (
          cm.role IN ('owner', 'admin')
          OR cm.can_manage_students = true
          OR cm.can_manage_training = true
          OR s.coach_id = auth.uid()
        )
    )
  );

-- ── get_students_last_activity: alinhar com a visibilidade acima ──────────────
-- Sem isto, a RPC (SECURITY DEFINER) continuaria vazando student_id + timestamp
-- de alunos que o coach comum não pode mais ver na tabela students.
CREATE OR REPLACE FUNCTION public.get_students_last_activity()
 RETURNS TABLE(student_id uuid, last_test_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.student_id, MAX(t.created_at) AS last_test_at
  FROM public.tests t
  JOIN public.students s ON s.id = t.student_id
  WHERE s.coach_id = auth.uid()
     OR s.user_id = auth.uid()
     OR public.has_role(auth.uid(), 'admin')
     OR (
       s.company_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.company_members cm
         JOIN public.companies co ON co.id = cm.company_id
         WHERE cm.company_id = s.company_id
           AND cm.user_id = auth.uid()
           AND co.status = 'active'
           AND (cm.role IN ('owner', 'admin') OR cm.can_manage_students = true OR cm.can_manage_training = true)
       )
     )
  GROUP BY t.student_id;
$function$;
