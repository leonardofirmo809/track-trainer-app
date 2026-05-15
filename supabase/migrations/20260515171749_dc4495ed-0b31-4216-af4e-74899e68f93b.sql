ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'coach_role_removed';

CREATE OR REPLACE FUNCTION public.get_all_coaches()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  has_role boolean,
  students_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    u.email::text,
    u.created_at,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'coach') AS has_role,
    (SELECT count(*)::int FROM public.students s WHERE s.coach_id = p.id) AS students_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles r2
    WHERE r2.user_id = auth.uid() AND r2.role = 'admin'
  )
  ORDER BY u.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_coaches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_coaches() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_coaches() TO authenticated;