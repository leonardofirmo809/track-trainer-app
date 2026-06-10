# Área do Corredor (Self-Service) — Plano

Implementação de um terceiro papel `runner` com cadastro aberto, onboarding em wizard e dashboard próprio, reusando 100% do motor de planilhas, zonas, editor e PDF existentes. Sem billing nesta fase.

---

## 1. Banco de dados (3 migrations)

**Migration A — enum (isolada, obrigatório):**
- `ALTER TYPE app_role ADD VALUE 'runner';`

**Migration B — schema:**
- `students.user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE`, índice em `user_id`.
- `students.coach_id` → nullable.
- CHECK: `coach_id IS NOT NULL OR user_id IS NOT NULL`.
- `profiles` ganha: `goal_distance text`, `goal_level int`, `race_date date`, `runner_onboarding_completed bool default false`.
- Atualizar `handle_new_user`:
  - Lê `raw_user_meta_data->>'signup_type'`.
  - Se `runner`: cria profile, atribui role `runner`, **pula** o check de limite de coaches e o check de convite. Não cria registro em `students` (criado depois pelo wizard).
  - Se ausente: mantém regra atual (invite-only para coach).
- Guard de limite de 4 coaches: só conta/aplica quando role = `coach`.

**Migration C — RLS:**
- `students`: políticas adicionais
  - SELECT/UPDATE quando `user_id = auth.uid()`.
  - INSERT do próprio registro permitido a `runner` com `user_id = auth.uid()` e `coach_id IS NULL`.
- `training_plans` e `tests`: política adicional permitindo acesso quando o `student` vinculado tem `user_id = auth.uid()` (SELECT/INSERT/UPDATE/DELETE com `EXISTS (...)`). Manter policies de coach/admin intactas.
- `profiles`: garantir que runner pode SELECT/UPDATE próprio perfil (já deve existir via `id = auth.uid()`).
- RPC `get_all_coaches` / listagem de alunos do coach: garantir filtro `coach_id IS NOT NULL` para não vazar runners.

---

## 2. Auth e cadastro

- Nova rota pública `/cadastro-corredor` (nome, email, senha). Faz `supabase.auth.signUp` com `options.data = { signup_type: 'runner', full_name }`.
- `/signup` mantém comportamento atual (invite-only). Adicionar link visível "Sou corredor — criar conta" → `/cadastro-corredor` em `/login` e `/signup`.
- Reset de senha: reusar fluxo existente.

**Redirect pós-login** (centralizar em `_authenticated/route.tsx` guard + `index.tsx`):
- `admin`/`coach` → `/dashboard` (atual).
- `runner` sem onboarding → `/corredor/onboarding`.
- `runner` com onboarding → `/corredor`.
- Bloquear cruzamento: runner não acessa `/dashboard`, `/alunos`, `/admin`, `/planilha-*`, `/teste-3km`, `/minha-marca`; coach/admin não acessam `/corredor/*`. Implementar no `beforeLoad`/guard com base em `useRoles`/query.

---

## 3. Onboarding `/corredor/onboarding` (wizard 4 passos)

State local, nada persiste até confirmar.

1. **Objetivo**: cards 10/21/42km + `race_date` opcional.
2. **Nível**: dois cards (N1/N2) com descrições; sem teste classificatório.
3. **Avaliação**: reusa `src/lib/teste-3km.ts` e correlatos. Tipos de teste: 3km, 5km, 10km, Cooper (12min), 2400m. Cada um com instrução. Calcula FTP `min:sec` e mostra zonas Z1–Z5 (De=mais rápido, Até=mais lento) + km/h esteira — reusar exatamente o componente de zonas atual.
4. **Dias da semana**: reusar componente de slots ordenados existente (`PlanilhaCustomizerSheet` / distribute helpers); quantidade definida pela combinação distância/nível. Manter alerta de dias consecutivos de alta intensidade.

**Confirmar**: cria `students` (`user_id=auth.uid()`, `coach_id=NULL`, `full_name=profile.full_name`, `target_distance`, `level`), salva teste em `tests`, chama a mesma server fn de geração do coach (`planilha-{10,21,42}km.functions.ts`) para criar `training_plans`, marca `runner_onboarding_completed=true`, redireciona para `/corredor`.

Adaptar as server fns de geração para aceitar planos sem `coach_id` (passar `coach_id` como nullable em insert) — ou criar wrappers `*-runner.functions.ts` que chamam os mesmos `distribute`/`data` puros e fazem o insert com `user_id`. **Preferência: tornar as functions existentes coach-id-opcional**, derivando o owner do `student` (se `user_id` presente, gravar `coach_id=NULL`).

---

## 4. Dashboard do corredor

Rotas novas sob layout `src/routes/_corredor/route.tsx` (gate `runner`, redirect outros papéis):
- `/corredor` — visão geral: header com objetivo+contagem regressiva, navegação 5 Planilhas × 4 semanas, gráficos de volume e intensidade (reuso dos componentes atuais), editor completo embutido.
- `/corredor/avaliacao` — refazer teste, ver zonas e histórico.
- `/corredor/planilha/nova` — reabre wizard (passos 1, 2, 4; passo 3 pré-preenchido com opção de refazer). Arquiva plano anterior (`status='arquivada'`).

**Editor**: reusar `PrescricaoEditor`/`PrescricaoEditorSheet`, `training-store.ts` (Zustand+undo), `QuickSwapPopover`, `session-library.ts`. Regra de imutabilidade da biblioteca (cópia custom com novo UUID) já é do store — não tocar.

**PDF**: reusar `useGeneratePDF` / `planilha-*-pdf.ts`. Quando `coach_id` null, o cabeçalho do PDF usa `profile.full_name` (corredor) no lugar do treinador; ocultar branding de coach.

Layout: novo `AppSidebar` simplificado para runner (Visão geral, Avaliação, Nova planilha, Sair) ou variante condicional do sidebar atual baseada no role. Bottom nav mobile equivalente. Mesma paleta verde/Plus Jakarta Sans.

---

## 5. Detalhes técnicos

- `useRoles` já retorna roles; adicionar helper `isRunner`. Atualizar `_authenticated.tsx` guard para roteamento por papel.
- `src/routes/index.tsx` e `/login` pós-auth: roteador por role.
- Listagem de alunos do coach (`alunos.index.tsx`) e RPC `get_students_last_activity`: garantir `WHERE coach_id IS NOT NULL` (ou filtro por coach_id do auth user) para não retornar registros de runners.
- Server fns de planilha: tornar `coach_id` opcional na assinatura; default = `coach_id` do student ou NULL. Quando criar via runner, `coach_id=NULL`.
- Types regenerados após migration aprovada antes de escrever código que usa `runner_onboarding_completed`, etc.

---

## 6. Fora de escopo

- Pagamentos / billing / paywall.
- Vínculo de runner a um coach existente.
- Alterações nos fluxos de coach/admin (convites, limite de 4, branding, auditoria, gestão de alunos).
- Reimplementar motor, zonas, editor ou PDF.

---

## 7. Ordem de execução

1. Migration A (enum runner).
2. Migration B (schema + handle_new_user + guard de licença).
3. Migration C (RLS de students/training_plans/tests).
4. Página `/cadastro-corredor` + ajuste de redirect por role.
5. Wizard `/corredor/onboarding` (reuso de componentes de zonas e dias).
6. Layout `_corredor` + dashboard + editor + PDF.
7. Ajustes em listagens do coach para excluir runners.
8. Testes manuais dos 8 critérios de aceite.
