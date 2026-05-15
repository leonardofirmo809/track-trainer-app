## Objetivo

Criar uma camada de **personalização do plano gerado** por aluno: depois que a planilha (5/10/21/42km) é gerada, o treinador abre a tela de Prescrição daquele aluno e pode trocar dias, mover treinos, editar campos livremente e usar/criar sessões da biblioteca. Tudo persiste no `training_plans.payload` (sem mudança de schema) e em `localStorage` (cache otimista + undo).

## Arquitetura

### Nova rota
`/_authenticated/alunos/$studentId/prescricao/$planId.tsx`
- Carrega `training_plans` (payload base + `customized_weeks` se já existir).
- Acessada por novo botão **"Personalizar"** na aba *Planilhas* do perfil do aluno (`alunos.$studentId.tsx`).

### Persistência (sem migration)
- Reaproveita `training_plans.payload` (jsonb).
- Adiciona campo `payload.customization = { weeks: WeekPlan[], updatedAt }`.
- Ao abrir: se `customization.weeks` existe → usa; senão **deriva** a partir do plano gerado.
- Novo server fn `savePlanCustomization(planId, weeks)` (auth-middleware, RLS já garante coach-owner).
- Biblioteca custom (`customSessions`) fica no zustand persist por treinador (chave `training-store-v1`), independente de aluno.

### Tipos compartilhados
Novo arquivo `src/lib/training-session-types.ts` com `Zone`, `SessionType`, `IntensityLevel`, `DayOfWeek`, `TrainingSession`, `WeekPlan`, e a constante `INTENSITY_CONFIG`.

### Biblioteca de sessões
Novo arquivo `src/lib/session-library.ts` com o array `sessionLibrary` literal exato fornecido pelo usuário (RE/BA/IAE/LON/PRO/PRL/TRU/IAM/CRL/CRAP/SUB/IAI/IAL/IMI). Imutável.

### Store
Novo `src/lib/training-store.ts` com Zustand + `persist` exatamente conforme spec, mais:
- `loadPrescription(planId, weeks)` — hidrata estado a partir do banco.
- `markDirty / markClean` para o botão "Salvar".
- `recalcSummary` aplicado em todos os mutators (add/remove/swap/move/update).
- `history` capado em 10 (Ctrl+Z).
- Sessão pré-pronta (isCustom:false) editada na grade → clona com novo `crypto.randomUUID()` e `isCustom:true` antes de salvar.

### Adapter plano gerado → WeekPlan[]
Novo `src/lib/plan-to-weeks.ts`:
- Lê o `payload` das planilhas existentes (5/10/21/42km já têm estruturas distintas) e mapeia cada treino para um `TrainingSession` plausível buscando por código/tipo na biblioteca, fallback `CUSTOM`.
- Distribui pelos 7 dias da semana respeitando a distribuição original do plano.
- Preenche `summary` via `recalcSummary`.

### Server function
`src/lib/plan-customization.functions.ts`:
- `getPlanCustomization({ planId })` → `{ basePayload, weeks | null }`.
- `savePlanCustomization({ planId, weeks })` → faz `select` para conferir `coach_id = userId`, atualiza `payload = jsonb_set(payload,'{customization}', ...)`.
- Validação Zod estrita do shape de `WeekPlan[]`.
- Registrado em `start.ts` via `attachSupabaseAuth` (já configurado).

## Componentes (novos em `src/components/prescription/`)

```
PrescriptionPage.tsx     route component, header + WeeklyGrid + drawers
WeeklyGrid.tsx           7×N grade, DndContext, Ctrl+Z, "Salvar" / "Desfazer"
SessionDayCard.tsx       card compacto com badge intensidade, drag handle, 3 botões
EmptyDayCell.tsx         célula vazia com "+", abre SessionLibrary com target
WeekSummary.tsx          totais km / duração / barra L vs M+H / minutos por zona
SessionLibrary.tsx       Sheet lateral: filtros LOW/MOD/HIGH + chips tipo + busca + cards
SessionLibraryCard.tsx   "Usar" / "Ver/Editar" / lixeira (custom)
SessionEditor.tsx        Sheet lateral: form completo (campos abaixo)
StructureBlocksEditor.tsx lista @dnd-kit/sortable de blocos warmup/main/recovery
ZoneInputs.tsx           5 inputs Z1-Z5 + botão "⚡ Auto-calcular" (parse blocos)
TagsInput.tsx            chips removíveis + input "adicionar"
IntensityBadge.tsx       usa INTENSITY_CONFIG
```

### SessionEditor — campos (conforme spec)
Código, Nome, toggle LOW/MOD/HIGH, select SessionType, radio modo (tempo/distância), duração HH:MM:SS, distância em metros, blocos de estrutura ordenáveis (fase / label / content / zona / duração ou distância), zonas Z1-Z5 editáveis + auto-calcular, %Low e %M+H editáveis, tags, descrição.
- Se `editorTarget` setado → `updateSession`. Se não → `saveToLibrary`.
- Checkbox "Salvar na biblioteca também" (quando há target).
- Sessões biblioteca pré-pronta editadas em prescrição clonam com novo uuid + `isCustom:true`.

## Dependências

```bash
bun add zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
(Já existem: zod, sonner, todos shadcn.) `crypto.randomUUID()` para ids — sem `uuid`.

## Integração com o perfil do aluno
`src/routes/_authenticated/alunos.$studentId.tsx` aba *Planilhas*: nova coluna **Ação** com botão **"Personalizar"** que linka para `/alunos/$studentId/prescricao/$planId`.

## Cores intensidade
Seguindo a spec, mas via CSS tokens semânticos em `src/styles.css`:
```css
--intensity-low-bg: oklch(...);  --intensity-low-fg: ...;
--intensity-mod-bg: ...;         --intensity-mod-fg: ...;
--intensity-high-bg: ...;        --intensity-high-fg: ...;
```
`INTENSITY_CONFIG` referencia classes Tailwind que usam essas vars (não hex direto em componentes).

## Ordem de execução

1. `bun add zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
2. Criar tipos + biblioteca + store + adapter + tokens CSS de intensidade.
3. Criar server fn `plan-customization.functions.ts`.
4. Criar componentes em `src/components/prescription/` (de baixo para cima).
5. Criar rota `alunos.$studentId.prescricao.$planId.tsx`.
6. Adicionar botão "Personalizar" em `alunos.$studentId.tsx`.
7. Smoke test: gerar planilha 10km → personalizar → swap dois dias → editar um treino → salvar → reload → conferir persistência.

## Fora de escopo (não nesta entrega)
- Versionar histórico no banco (history fica só em memória/localStorage).
- Multi-coach colaborativo / conflito de edição.
- Regenerar PDF a partir do plano customizado (próxima iteração).
