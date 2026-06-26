-- Fase 2H: corrige get_students_last_activity para incluir alunos de empresa.
-- Sem este fix, coaches de empresa viam coluna "última atividade" vazia
-- para alunos cadastrados por outros coaches da mesma empresa.

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
     OR (s.company_id IS NOT NULL AND public.is_company_member(auth.uid(), s.company_id))
  GROUP BY t.student_id;
$function$;
