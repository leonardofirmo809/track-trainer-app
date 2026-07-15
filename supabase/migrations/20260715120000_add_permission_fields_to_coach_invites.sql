-- P3: torna explícita, no momento da criação do convite, a permissão de
-- treino/testes que o coach receberá ao aceitar. Antes, acceptInvite gravava
-- can_manage_training=true de forma hardcoded para todo coach convidado a uma
-- empresa (ver 20260626230000_company-member-permissions.sql para o default
-- da coluna em company_members, que permanece inalterado). Aditiva: apenas
-- ADD COLUMN em coach_invites. Nenhuma policy, tabela ou dado existente é
-- alterado; membros já aceitos em company_members não são tocados.

ALTER TABLE public.coach_invites
  ADD COLUMN IF NOT EXISTS can_manage_students BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_training  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.coach_invites.can_manage_students IS
  'Permissão de gerenciar cadastro de alunos que será aplicada ao membro (company_members.can_manage_students) quando o convite for aceito. Default false.';

COMMENT ON COLUMN public.coach_invites.can_manage_training IS
  'Permissão de gerenciar treinos/testes que será aplicada ao membro (company_members.can_manage_training) quando o convite for aceito. Default false — antes deste convite ser aceito, esta era hardcoded true no código.';
