# Drawer "Personalizar" passa a espelhar a planilha real

## Problema
O drawer atual abre um editor genérico (grade 7 dias + biblioteca de sessões com tipo `TrainingSession`) que **não tem nada a ver** com o que a planilha mostra (`Fase 1-4 → Semana → Workout` com `code`, `type`, `zones`, `sections[].items[]`). Edits no drawer não refletem na planilha, e vice-versa.

## Solução
Substituir o `PrescricaoEditorSheet` **só dentro das 4 planilhas (5/10/21/42 km)** por um novo `PlanilhaCustomizerSheet` que:

1. **Espelha a planilha**: mesmas Tabs de Fase, mesmas WeekRow, mesmos cards coloridos por tipo (código, duração, volume, %L/%MH, zonas).
2. **Cada card abre um editor inline** (sub-Sheet à direita) com formulários para editar o `Workout`:
   - **Cabeçalho**: `code`, `type` (select), `zones[]` (toggle Z1-Z5), `note`.
   - **Sections** (warmup / main / recovery / complement): adicionar/remover, reordenar.
   - **Items** por section, cada um com tipo selecionável:
     - Single: valor + unidade (min/sec/m) + zona
     - Intervals: reps + ON (valor/unidade/zona) + OFF (valor/unidade/zona)
     - Test: metros + label + nota
   - Botões: **Salvar**, **Cancelar**, **Restaurar original** (some o override).
3. **Persistência via overrides**: edições não tocam o catálogo estático (`WORKOUTS`); são salvas como patches em `plan.payload.workoutOverrides`.

## Modelo de dados

```ts
plan.payload.workoutOverrides: {
  [phase: "1"|"2"|"3"|"4"]: {
    [weekIdx: "0"|"1"|"2"|"3"]: {
      [originalCode: string]: Partial<Workout>
    }
  }
}
```

Helper `applyOverrides(workouts, overridesForWeek)` retorna o array já patcheado. Usado no `useMemo weeks` da planilha **e** dentro do drawer (mesma fonte da verdade).

## Servidor

Nova server fn `savePlanWorkoutOverrides` em `src/lib/plan-customization.functions.ts`:
- Input: `{ planId, overrides }` validado por Zod (Workout partial com limites).
- Atualiza `plan.payload.workoutOverrides` preservando o resto do payload (level, daysPerWeek, weekDays, currentPhase, customization existente).
- Mesma checagem de coach/admin do `fetchPlanForCoach`.

## Aplicação na planilha

Em cada `planilha-Xkm.tsx`, no `useMemo weeks`:
```ts
const phaseWeeks = WORKOUTS[level][phase];
const overridesPhase = overrides[String(phase)] ?? {};
const patched = phaseWeeks.map((wos, w) =>
  applyOverrides(wos, overridesPhase[String(w)] ?? {})
);
return patched.map((wos) => distributeWeek(wos, weekDays, level));
```

`overrides` carregado de `dataQuery.data.plan.payload.workoutOverrides` em estado local, sincronizado por `useEffect`.

## Compartilhamento entre as 4 planilhas

Os tipos `Workout` das 4 planilhas têm shape compatível (mesmas chaves: `code`, `type`, `zones`, `sections[].items[]` com mesmos `kind`s — verificado nos `*-data.ts`). O componente recebe via props:
- `workoutTypes` (lista pra select), `phaseLabels`, `dayLabel/dayFull`
- `workouts: Workout[][][]` (catálogo já patcheado)
- `weekDays`, `level`, `phase` atual, `zones` (do Supabase)
- `overrides` + `onChangeOverrides`

Sem dependência hardcoded de `WORKOUTS` específico.

## Arquivos

**Novos**
- `src/components/planilha/PlanilhaCustomizerSheet.tsx`
- `src/components/planilha/PlanilhaCustomizerView.tsx`
- `src/components/planilha/WorkoutEditorSheet.tsx`
- `src/lib/workout-overrides.ts` (`applyOverrides`, tipo `WorkoutOverride`)

**Editar**
- `src/lib/plan-customization.functions.ts` — adicionar `savePlanWorkoutOverrides` + Zod do Workout partial.
- `src/routes/_authenticated/planilha-5km.tsx`, `-10km.tsx`, `-21km.tsx`, `-42km.tsx` — trocar `PrescricaoEditorSheet` por `PlanilhaCustomizerSheet`; aplicar overrides em `useMemo weeks`.

**Manter intactos**
- `PrescricaoEditor.tsx` e `PrescricaoEditorSheet.tsx` continuam servindo a rota antiga `/alunos/$studentId/prescricao/$planId` (deep-link).

## UX

- Update otimista: `setOverrides` instantâneo, save em background. Erro → `toast.error` + revert.
- Ao fechar o drawer: `dataQuery.refetch()` da planilha pai.
- "Restaurar original" remove o patch do treino e reverte ao catálogo.
