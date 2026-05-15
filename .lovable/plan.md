## Adicionar e remover treinos na semana (Personalizar planilha)

Estender o sistema de overrides para permitir, dentro de cada semana de cada fase, **remover** treinos do catálogo e **adicionar** treinos novos — além das edições já existentes.

### Modelo de dados (compatível com o existente)

Hoje: `workoutOverrides[phase][weekIdx][originalCode] = WorkoutPatch`.

Adicionar duas chaves reservadas no objeto da semana (com prefixo `__` para não colidir com códigos de treino):

```text
workoutOverrides[phase][weekIdx] = {
  [originalCode]: WorkoutPatch,   // edições (já existe)
  __removed?: string[],            // códigos originais ocultados nesta semana
  __added?: Workout[]              // treinos extras criados pelo usuário
}
```

Planos antigos continuam funcionando sem migração.

### Mudanças de código

**`src/lib/workout-overrides.ts`**
- Atualizar `applyOverrides(workouts, weekObj)` para:
  1. Filtrar `workouts` removendo os que estão em `__removed`.
  2. Aplicar os patches existentes sobre os restantes.
  3. Concatenar `__added` ao final.
- Novos helpers: `removeWorkout`, `restoreRemovedWorkout`, `addWorkout`, `updateAddedWorkout`, `deleteAddedWorkout` — todos retornando novo `WorkoutOverrides` e fazendo cleanup de chaves vazias.
- Manter `setOverride` / `getPatch` como estão.

**`src/lib/plan-customization.functions.ts`**
- Estender `OverridesSchema`: o objeto da semana passa a aceitar (além de `[code]: WorkoutPatch`) `__removed: z.array(z.string()).max(20).optional()` e `__added: z.array(WorkoutSchema).max(14).optional()`.
- Definir `WorkoutSchema` (code, type, zones, sections, note) reaproveitando os schemas já presentes.

**`src/components/planilha/PlanilhaCustomizerSheet.tsx`**
- No grid da semana:
  - Cada card de treino ganha um botão "Remover" (ícone trash, canto superior direito, `stopPropagation`). Para treino do catálogo → entra em `__removed`. Para treino adicionado → sai de `__added`.
  - Após o último card, um card pontilhado **"+ Adicionar treino"** abre o `WorkoutEditorDialog` em modo "novo" com defaults (code vazio, type "Base aeróbia", zones `["Z2"]`, uma section `main` com um item single).
  - Se houver removidos na semana, mostrar um pequeno rodapé "Removidos: COD1, COD2 — Restaurar" para devolver cada um.
- O `WorkoutEditorDialog` ganha modo `"new" | "added" | "edit"`:
  - `"edit"` (atual): edita patch sobre o original.
  - `"added"`: edita o treino dentro de `__added` (substitui pelo objeto completo). Botão inferior esquerdo vira "Excluir treino".
  - `"new"`: aplica o save adicionando o workout em `__added`.
- Validação leve: exigir `code` não vazio antes de aplicar.
- Aviso visual: se `patched.length > diasDisponíveis` (a `distributeWeek` solta os excedentes), mostrar badge "X treino(s) não couberam nesta semana".

**Persistência**
- Reutiliza `savePlanWorkoutOverrides`. Sem mudanças nas 4 rotas `planilha-Xkm.tsx` — elas já chamam `applyOverrides` que agora respeita `__added`/`__removed`.

### Fora de escopo
- Reordenar treinos manualmente (a distribuição automática por dia continua igual).
- Mudar a quantidade de dias da semana do aluno (isso vive na configuração do plano).
- PDF/visualizações fora da planilha (o pipeline atual já consome a lista patcheada).
