CREATE OR REPLACE FUNCTION public.get_students_last_activity()
RETURNS TABLE(student_id uuid, last_test_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.student_id, MAX(t.created_at) AS last_test_at
  FROM public.tests t
  JOIN public.students s ON s.id = t.student_id
  WHERE s.coach_id = auth.uid()
     OR public.has_role(auth.uid(), 'admin')
  GROUP BY t.student_id;
$$;