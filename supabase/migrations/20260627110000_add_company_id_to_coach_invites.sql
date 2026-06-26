-- Fase 2G: permite associar um convite de coach a uma empresa.
-- Quando aceito, o coach é adicionado automaticamente à company_members (via server function).

ALTER TABLE public.coach_invites
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS coach_invites_company_id_idx ON public.coach_invites(company_id);
