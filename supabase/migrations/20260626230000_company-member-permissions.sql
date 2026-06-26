-- Fase 2C.1 — permissões granulares por membro da empresa.
-- Aditiva: apenas ADD COLUMN. Nenhuma policy, tabela ou dado existente é alterado.

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS can_manage_students BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_training  BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.company_members.can_manage_students IS
  'Coach pode criar/editar dados cadastrais de alunos da empresa. Owner/admin têm esta permissão implicitamente pelo papel.';

COMMENT ON COLUMN public.company_members.can_manage_training IS
  'Coach pode montar treinos e preencher informações técnicas/testes dos alunos vinculados.';
