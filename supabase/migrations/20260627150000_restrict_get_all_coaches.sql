-- Fase 2I (risco 1): get_all_coaches() agora lança exceção para não-admins.
-- Antes: a função retornava resultado vazio para não-admins (WHERE EXISTS filtrando).
-- Agora: lança RAISE EXCEPTION com ERRCODE insufficient_privilege.
-- O GRANT EXECUTE para authenticated permanece (necessário para supabase.rpc()),
-- mas a função bloqueia internamente qualquer usuário sem role admin.

CREATE OR REPLACE FUNCTION public.get_all_coaches()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  has_role boolean,
  students_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: apenas administradores podem listar coaches.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      u.email::text,
      u.created_at,
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'coach') AS has_role,
      (SELECT count(*)::int FROM public.students s WHERE s.coach_id = p.id) AS students_count
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY u.created_at DESC;
END;
$$;
