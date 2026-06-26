-- Fase 1 multiempresa — estrutura base.
-- Aditiva: não altera nenhuma tabela, policy ou função existente.

-- 1. Enum de papel dentro da empresa
DO $$ BEGIN
  CREATE TYPE public.company_role AS ENUM ('owner', 'admin', 'coach');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela de empresas
CREATE TABLE IF NOT EXISTS public.companies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        UNIQUE,
  status     TEXT        NOT NULL DEFAULT 'active',
  created_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Tabela de membros da empresa
CREATE TABLE IF NOT EXISTS public.company_members (
  id         UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID                NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id    UUID                NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.company_role NOT NULL DEFAULT 'coach',
  created_at TIMESTAMPTZ         NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- 4. Função SECURITY DEFINER para verificar membro (evita RLS recursivo nas policies)
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_company_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID, UUID) TO authenticated;

-- 5. RLS: companies
-- Admin global pode tudo (SELECT + INSERT + UPDATE + DELETE)
CREATE POLICY "global admins manage companies"
  ON public.companies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Membros autenticados veem as empresas das quais fazem parte
CREATE POLICY "members see own company"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), id));

-- 6. RLS: company_members
-- Admin global pode tudo
CREATE POLICY "global admins manage company_members"
  ON public.company_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cada usuário autenticado vê o próprio registro de membro
CREATE POLICY "user sees own membership"
  ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
