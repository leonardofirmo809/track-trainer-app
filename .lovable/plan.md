## Problema

No sheet "Personalizar treino do dia" (`SessionEditorSheet` em `src/components/prescricao/PrescricaoEditor.tsx`), quando o treinador edita um treino existente, todos os campos são editáveis — exceto o **dia da semana**, que fica fixo no dia original (`editorTarget.day`). A única forma de mover é via drag-and-drop no grid.

## Mudança

Arquivo único: **`src/components/prescricao/PrescricaoEditor.tsx`** — `SessionEditorSheet`.

1. **Adicionar estado local de destino** quando `editorTarget` está presente:
   - `targetDay: DayOfWeek` (inicia com `editorTarget.day`)
   - `targetWeekIndex: number` (inicia com `editorTarget.weekIndex`)
   - Resetar no mesmo `useEffect` que reseta o `draft`.

2. **Adicionar 2 campos no formulário** (logo abaixo do título, só quando `editorTarget` existe, antes da grid Código/Nome):
   - **Select "Semana"** com opções `Semana 1..N` (N = `store.prescription.weeks.length`).
   - **Select "Dia da semana"** com as 7 opções usando `DAYS_OF_WEEK` + `DAY_LABELS`.

3. **Ajustar `handleSave`** quando `editorTarget` existe:
   - Se `targetWeekIndex === editorTarget.weekIndex && targetDay === editorTarget.day` → comportamento atual (`updateSession`).
   - Senão:
     - Chamar `updateSession(editorTarget.weekIndex, editorTarget.day, draft)` para salvar as edições no slot atual.
     - Verificar se o destino está ocupado lendo `store.prescription.weeks[targetWeekIndex]?.days[targetDay]`:
       - Ocupado → `swapSessions({ weekIndex: editorTarget.weekIndex, day: editorTarget.day }, { weekIndex: targetWeekIndex, day: targetDay })`.
       - Vazio → `moveSession(...)` com mesmos argumentos.
     - Toast: `"Treino movido para {DAY_LABELS[targetDay]}, semana {targetWeekIndex+1}"`.
   - Manter o checkbox "Salvar também na biblioteca" como hoje.

4. Acessar `store.prescription.weeks` via `useTrainingStore()` no componente (já é o padrão usado em outros lugares).

## Fora de escopo

- Drag-and-drop atual continua funcionando.
- `SessionLibrarySheet` (já permite escolher dia ao adicionar).
- PDF, banco, distribuição, outras planilhas.
- Validação de regras de "dias permitidos por nível" — o usuário já pode arrastar para qualquer dia hoje.
