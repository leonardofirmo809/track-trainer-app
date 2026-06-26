-- Fase 2H (bug 4): is_company_member() passa a exigir company.status = 'active'.
-- Membros de empresas inativas perdem acesso via todas as policies que usam esta função:
--   "company member sees students", "company member sees tests", "company member sees plans",
--   "members see own company".
-- Admin global continua com acesso total via has_role('admin') independentemente desta função.

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    JOIN public.companies co ON co.id = cm.company_id
    WHERE cm.user_id = _user_id
      AND cm.company_id = _company_id
      AND co.status = 'active'
  )
$$;
