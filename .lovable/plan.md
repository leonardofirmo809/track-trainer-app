## Problema

Hoje a tela "3. Configuração da semana" (5km, 10km, 21km e 42km) **trava** se o treinador escolher uma quantidade de dias diferente da regra fixa:

- 5km / 10km Nível 1 → exatamente 3 dias
- 10km Nível 2 → 4 ou 5 dias
- 21km / 42km → exatamente 4 dias

Quando o número não bate, aparece o aviso laranja "Selecione exatamente X dias" e o botão **Aplicar configuração** fica desativado. Pior: mesmo quando a contagem casa, o sistema **distribui automaticamente** os treinos pelos dias selecionados (em ordem da semana) e **descarta silenciosamente** os treinos que sobram (Regenerativos primeiro, depois duplicados). O treinador não escolhe **qual** treino vai em **qual** dia.

## O que muda

Liberar totalmente a montagem da semana:

1. **Quantos dias quiser (1 a 7)** — sem regra rígida.
2. **Adicionar / remover treino** dentro do "Personalizar planilha", já existente, com o botão "Adicionar treino" que já está lá.
3. **Mover treino de um dia para outro** — arrastar ou escolher o dia em um menu dentro do card.
4. **Sem descarte silencioso** — se sobrar treino, ele aparece numa bandeja "Treinos sem dia" pra você decidir; se sobrar dia, ele vira "OFF".

## Telas afetadas

- `Planilha 5km`, `Planilha 10km`, `Planilha 21km`, `Planilha 42km` (card "3. Configuração da semana")
- Modal **Personalizar planilha** (passa a ser onde o treinador realmente monta a semana)

## Comportamento novo do card "Configuração da semana"

- O texto de regra ("Selecione exatamente 3 dias") vira só uma **sugestão**: "Sugestão para o nível X: 3 dias. Você pode escolher quantos quiser."
- O aviso laranja some.
- Botão **Aplicar configuração** sempre habilitado (desde que pelo menos 1 dia esteja marcado).
- Se a contagem ficar diferente da sugestão, mostra um **aviso suave azul** (não bloqueia): "Você escolheu 5 dias; a planilha original tem 3 treinos por semana — os 2 dias extras ficarão como descanso, ou adicione treinos extras na próxima etapa."

## Comportamento novo do "Personalizar planilha"

Hoje cada card de treino mostra apenas o dia que o sistema decidiu. Vai passar a ter:

- Um **seletor de dia** dentro de cada card (SEG/TER/.../DOM/Sem dia).
- Arrastar e soltar entre dias da grade (desktop). No mobile, o seletor dropdown resolve.
- Uma **bandeja "Treinos sem dia"** acima da grade quando houver treinos não atribuídos (em vez de descartá-los).
- Os dias OFF continuam aparecendo como cards tracejados.

A semana inteira passa a ser **livre**: o treinador pode ter 2 treinos no sábado se quiser (não vamos impedir, só mostraremos um aviso suave "Você tem mais de um treino no mesmo dia").

## Detalhes técnicos

1. **Validações relaxadas** em:
   - `src/lib/planilha-5km-distribute.ts` (já não trava, mas o `dropToFit` precisa virar opcional)
   - `src/lib/planilha-10km-distribute.ts` → `validateWeekDays10km` retorna sempre `null` (vira só sugestão)
   - `src/lib/planilha-21km-distribute.ts` e `src/lib/planilha-42km-distribute.ts` → idem
   - `allowedDayCounts*` deixa de ser usado para bloquear

2. **Novo campo no override** (`src/lib/workout-overrides.ts`):
   - `WorkoutPatch.day?: DayCode | null` — se setado, usa este dia em vez da distribuição automática.
   - Adicionar helpers `setWorkoutDay(overrides, phase, week, code, day)` e equivalente para `__added`.

3. **Nova distribuição** (`src/lib/planilha-5km-distribute.ts`):
   - Nova função `distributeWeekManual(workouts, selectedDays, manualDayByCode)` que:
     - respeita `manualDayByCode[code]` quando presente,
     - preenche dias livres com os treinos restantes (na ordem do código),
     - **não descarta** treinos: o que sobrar volta na lista `unassigned`.
   - `DistributionResult` ganha `unassigned: T[]` e `multipleByDay: Record<DayCode, T[]>` (para o aviso de mais de 1 treino no dia).

4. **PlanilhaCustomizerSheet** (`src/components/planilha/PlanilhaCustomizerSheet.tsx`):
   - Adiciona seletor "Dia" no `WorkoutEditorDialog`.
   - Renderiza a bandeja "Treinos sem dia" usando `dist.unassigned`.
   - Drag-and-drop nativo HTML5 entre cards (desktop). Mobile fica só com o dropdown.
   - Remove o badge vermelho "X treino(s) não couberam" — agora é um aviso amarelo "X treinos sem dia atribuído".

5. **Páginas das 4 planilhas**: trocam `validateWeekDays*` por uma função de **sugestão** que devolve `{ suggested: number, message: string | null }` e ajustam o card 3 (texto + aviso suave + botão sempre habilitado se ≥1 dia).

## Não muda

- Geração de PDF, cálculo de zonas, paces, estatísticas e gráficos continuam iguais — recebem a `assignments` já com a alocação manual.
- Catálogo de treinos por nível/fase continua o mesmo.
- Personalização de carga (séries, paces, zonas) já existente segue funcionando.

## Fora de escopo

- Reordenar treinos **entre semanas/fases** (continua dentro da mesma semana).
- Mover treino entre fases diferentes.
- Salvar dias por semana (a configuração de dias ainda é a mesma para as 4 semanas da fase; o que muda é a alocação treino→dia, que é por semana).
