## Dashboard completo do corredor

Criar uma experiência dedicada sob `/corredor/*`, reusando 100% do motor de planilhas (`planilha-{10,21,42}km.tsx`, distribuição, zonas, editor, PDF). Sem novo backend além de pequenos ajustes de branding no PDF.

### 1. Novas rotas (todas sob `_authenticated/`)

```
src/routes/_authenticated/
  corredor.index.tsx          → /corredor   (reescrita: dashboard completo)
  corredor.planilha.tsx       → /corredor/planilha   (planilha do próprio runner)
  corredor.avaliacao.tsx      → /corredor/avaliacao  (zonas + histórico + refazer)
  corredor.planilha.nova.tsx  → /corredor/planilha/nova (reabre wizard)
```

O guard de `_authenticated.tsx` já restringe runner a `/corredor/*`, `/planilha-*`, `/teste-3km`. Ajuste: runner deve usar **somente** `/corredor/*` (remover `/planilha-*` e `/teste-3km` da allow-list; expor essas funcionalidades dentro das rotas `/corredor/*`).

### 2. `/corredor` — Dashboard (reescrita do arquivo existente)

Substitui o card simples atual por:

- **Header**: saudação + objetivo (10/21/42 + Nível) + data da prova + contagem regressiva (dias e semanas).
- **Card "Plano atual"** (4 mini-cards de Plano 1–4): mostra qual está ativo, link "Abrir Plano X" → `/corredor/planilha?plano=X`.
- **Card "Resumo de volume/intensidade"** da fase ativa: reusa `PhaseChartsBlock` (volume km/semana + barras Z1–Z5) já existente nos arquivos `planilha-*`. Extraio o bloco para componente compartilhado `src/components/planilha/PhaseChartsBlock.tsx` (move, não duplica).
- **Ações rápidas**: Editar planilha · Exportar PDF · Refazer avaliação · Nova planilha.
- **Empty state**: se sem onboarding → redirect para `/corredor/onboarding` (já existe).

### 3. `/corredor/planilha` — Editor da própria planilha

Em vez de duplicar 678 linhas de `planilha-10km.tsx`, faço refator mínimo:

- Extrair o corpo das três páginas `planilha-{10,21,42}km.tsx` para um componente compartilhado `PlanilhaWorkspace` (que aceita `studentId` e `distance` como props), mantendo as rotas de coach como wrappers que renderizam `<PlanilhaWorkspace studentId={pickedId} distance="10km" allowStudentPicker />`.
- Em `/corredor/planilha`: descobre `studentId` do runner via `getRunnerOverview` (já existe) e `goal_distance` do profile, renderiza `<PlanilhaWorkspace studentId={myStudentId} distance={goal} allowStudentPicker={false} />`.
- Diferenças visuais runner: sem `StudentPicker`, sem `DistanceSelector` (objetivo é fixo), sem breadcrumb coach; mostra link "Mudar objetivo → Nova planilha".
- Param `?plano=1..4` ativa a tab inicial da fase.

> Risco contido: o refator extrai o JSX 1:1 sem mudar lógica. Os arquivos `planilha-{10,21,42}km.tsx` continuam funcionando para coach.

### 4. `/corredor/avaliacao`

- Mostra zonas atuais (Z1–Z5, mesmo card do existente).
- Lista histórico de testes (`tests` do próprio student, mais recente primeiro).
- Botão "Refazer teste" → wizard inline reusa o passo 3 do onboarding (`teste-3km.ts` + UI). Ao salvar, regenera zonas mas **não** recria planilha (apenas grava `tests`); avisa "Para aplicar à planilha, crie uma Nova planilha".

### 5. `/corredor/planilha/nova`

- Reabre o wizard de `/corredor/onboarding` pulando para os passos 1 (objetivo), 2 (nível), 3 (teste — pré-preenchido com último, opção "usar último" ou "refazer"), 4 (dias).
- Ao confirmar: arquiva `training_plans` ativos do student (`status='arquivada'`) e chama `completeRunnerOnboarding` (ou função análoga `regenerateRunnerPlan`) que cria novo plano.
- Pequeno ajuste em `runner.functions.ts`: nova fn `regenerateRunnerPlan` que arquiva ativos e insere novo (sem mexer no profile se distância igual).

### 6. PDF — branding do runner

Em `useCoachBranding` (ou wrapper local), quando `coach_id` é null usar `profile.full_name` do runner como `coachName` e logo padrão (sem logo). Ajuste isolado no hook ou no call site dentro de `PlanilhaWorkspace`.

### 7. Sidebar/Nav

- `app-sidebar.tsx` já filtra por role. Para runner, adicionar itens: Visão geral (`/corredor`), Minha planilha (`/corredor/planilha`), Avaliação (`/corredor/avaliacao`), Nova planilha (`/corredor/planilha/nova`). Remover Planilhas/Alunos/Dashboard quando `isRunner && !isCoach && !isAdmin`.
- `MobileBottomNav`: variante runner com 4 itens (Home, Planilha, Avaliação, Perfil).

### 8. Fora de escopo

- Pagamento, multi-coach, vínculo runner↔coach, alterações em fluxos de coach/admin, novas migrations (schema já está pronto).

### Ordem de execução

1. Extrair `PlanilhaWorkspace` (refator dos 3 `planilha-*km.tsx`).
2. Extrair `PhaseChartsBlock` para componente compartilhado.
3. Reescrever `/corredor` (dashboard completo).
4. Criar `/corredor/planilha`, `/corredor/avaliacao`, `/corredor/planilha/nova`.
5. Ajustar sidebar/bottom-nav para runner.
6. Ajustar branding PDF quando `coach_id` null.
7. Apertar guard: runner restrito a `/corredor/*`.
