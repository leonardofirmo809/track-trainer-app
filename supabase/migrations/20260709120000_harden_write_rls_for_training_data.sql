-- FASE 1 da auditoria geral (2026-07-09): fecha 2 brechas CRÍTICAS de RLS de escrita
-- encontradas na tabela tests/training_plans (INSERT) e students (UPDATE).
--
-- Problema 1 e 2 — "coach inserts own tests" / "coach inserts own plans":
--   WITH CHECK só validava `auth.uid() = coach_id`, sem nenhum vínculo com o
--   student_id do registro. Qualquer coach autenticado (de qualquer empresa,
--   ou sem empresa) podia inserir um teste ou plano de treino falso em um
--   aluno de OUTRA empresa, bastando setar coach_id para o próprio uid e
--   student_id para o id do aluno alheio (id previsível/vazável via UI,
--   screenshot, log etc). Como o SELECT dessas tabelas já é corretamente
--   escopado por empresa, o dado forjado passava a ser exibido de volta
--   para o coach/aluno legítimos da empresa vítima.
--
-- Problema 3 — "coach updates own students":
--   Tinha USING (auth.uid() = coach_id) mas nenhum WITH CHECK. Um coach
--   conseguia, em qualquer aluno que já possuía, reatribuir company_id para
--   uma empresa da qual não é membro (infiltrando um "aluno fantasma" no
--   roster de outra empresa) ou reatribuir user_id para um valor arbitrário.
--
-- Problema 4 (encontrado no diagnóstico original, corrigido aqui) —
-- "coach inserts own students" (criada em 20260627130000_harden_students_
-- insert_rls.sql): o EXISTS daquela policy tem `WHERE cm.company_id =
-- company_id` — o `company_id` do lado direito está SOLTO (não qualificado)
-- dentro de um subselect cujo FROM já contém `company_members cm`, que
-- também tem uma coluna chamada `company_id`. Pela regra de escopo do
-- Postgres, um identificador não qualificado resolve para o escopo mais
-- interno que o contém primeiro — então `company_id` ali resolve para
-- `cm.company_id`, e a condição vira `cm.company_id = cm.company_id`
-- (sempre verdadeira), em vez de comparar com o company_id do NOVO aluno
-- sendo inserido. Na prática, isso faz o EXISTS validar apenas "o usuário é
-- owner/admin/can_manage_students de ALGUMA empresa ativa", sem checar que
-- é da MESMA empresa do company_id sendo gravado — permitindo inserir aluno
-- em company_id de uma empresa da qual o usuário não é membro. Corrigido
-- abaixo qualificando explicitamente `students.company_id`. Não altero a
-- migration 20260627130000 (já commitada); a policy é substituída aqui via
-- DROP/CREATE, que é a forma correta de corrigir uma policy antiga sem
-- reescrever o arquivo histórico.
--
-- Qualificação de colunas: em todas as policies abaixo, toda referência à
-- linha sendo inserida/atualizada em `students` usa o prefixo `students.`
-- explicitamente sempre que aparece dentro de um subselect (mesmo quando o
-- Postgres já resolveria corretamente sem o prefixo), para deixar claro
-- qual coluna é comparada e evitar reintroduzir esse tipo de ambiguidade.
--
-- Nenhuma policy de SELECT ou DELETE é alterada. As policies "company
-- member manages tests/plans" (ALL, já corretamente escopadas por
-- empresa+role/flag em 20260627160000) e as policies de runner (já
-- corretamente escopadas via students.user_id) não são tocadas — apenas
-- somam-se via OR, como já faziam.

-- ── students: INSERT ─────────────────────────────────────────────────────────
-- Substitui a policy criada em 20260627130000 (tautologia descrita acima).
-- Regra: sempre coach_id = auth.uid() e user_id IS NULL (nenhum fluxo do
-- app seta user_id a partir do coach/admin — confirmado em
-- src/lib/students.functions.ts:createStudent, que sempre insere
-- coach_id: userId e nunca envia user_id). E então OR de:
--   A. admin global (has_role);
--   B. aluno sem empresa (fluxo legado / coach autônomo);
--   C. aluno dentro de uma empresa ativa da qual o usuário é owner/admin OU
--      tem can_manage_students = true (NÃO uso can_manage_training aqui:
--      essa flag governa treinos/testes, não cadastro de aluno — mesma
--      distinção já documentada em 20260626230000_company-member-
--      permissions.sql e já usada dessa forma na versão original,
--      pré-tautologia, desta policy).
DROP POLICY IF EXISTS "coach inserts own students" ON public.students;

CREATE POLICY "coach inserts own students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    students.coach_id = auth.uid()
    AND students.user_id IS NULL
    AND (
      public.has_role(auth.uid(), 'admin')
      OR students.company_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.company_members cm
        JOIN public.companies co ON co.id = cm.company_id
        WHERE cm.company_id = students.company_id
          AND cm.user_id = auth.uid()
          AND co.status = 'active'
          AND (cm.role IN ('owner', 'admin') OR cm.can_manage_students = true)
      )
    )
  );

-- ── tests: INSERT ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "coach inserts own tests" ON public.tests;

CREATE POLICY "coach inserts own tests"
  ON public.tests FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = tests.student_id
        AND (
          -- Coach é o responsável direto pelo aluno.
          s.coach_id = auth.uid()
          -- Admin global.
          OR public.has_role(auth.uid(), 'admin')
          -- Membro ativo da MESMA empresa do aluno, com papel/flag de gestão.
          OR (
            s.company_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.company_members cm
              JOIN public.companies co ON co.id = cm.company_id
              WHERE cm.company_id = s.company_id
                AND cm.user_id = auth.uid()
                AND co.status = 'active'
                AND (
                  cm.role IN ('owner', 'admin')
                  OR cm.can_manage_students = true
                  OR cm.can_manage_training = true
                )
            )
          )
        )
    )
  );

-- ── training_plans: INSERT ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "coach inserts own plans" ON public.training_plans;

CREATE POLICY "coach inserts own plans"
  ON public.training_plans FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = training_plans.student_id
        AND (
          s.coach_id = auth.uid()
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
                AND (
                  cm.role IN ('owner', 'admin')
                  OR cm.can_manage_students = true
                  OR cm.can_manage_training = true
                )
            )
          )
        )
    )
  );

-- ── students: UPDATE ─────────────────────────────────────────────────────────
-- USING permanece igual (coach só chega em linhas que já é dono via coach_id).
-- WITH CHECK novo impede que o resultado da atualização mova o aluno para uma
-- empresa da qual o coach não é membro qualificado, ou reatribua user_id.
-- Nenhum fluxo atual (students.functions.ts) seta user_id a partir do coach,
-- então exigir user_id IS NULL aqui não quebra nenhum caminho legítimo.
-- Revisado: a subquery já qualifica o lado do aluno como `students.company_id`
-- (não `company_id` solto), então não repete a tautologia de
-- 20260627130000 — confirmado nesta revisão. Referências de topo também
-- qualificadas com `students.` por consistência/auditabilidade, embora não
-- fossem ambíguas (não há outra tabela em escopo antes do primeiro EXISTS).
DROP POLICY IF EXISTS "coach updates own students" ON public.students;

CREATE POLICY "coach updates own students"
  ON public.students FOR UPDATE TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (
    students.coach_id = auth.uid()
    AND students.user_id IS NULL
    AND (
      students.company_id IS NULL
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.company_members cm
        JOIN public.companies co ON co.id = cm.company_id
        WHERE cm.company_id = students.company_id
          AND cm.user_id = auth.uid()
          AND co.status = 'active'
          AND (cm.role IN ('owner', 'admin') OR cm.can_manage_students = true)
      )
    )
  );
