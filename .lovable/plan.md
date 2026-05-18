## Causa raiz

Nas 4 rotas `planilha-5km/10km/21km/42km.tsx`, o `useMemo` que gera `weeks` (usado tanto na visualização principal quanto na exportação do PDF) chama `distributeWeek(applyOverrides(wos, weekOv), weekDays, level, typesMap)` **sem passar `manualDayByCode`**.

Só o `PlanilhaCustomizerSheet` passa `opts` com o mapa manual de dias (`distributeWeek(..., opts)`), então:

- Dentro do "Personalizar planilha", o usuário vê os treinos nos dias que ele definiu manualmente.
- Na **tela principal** e no **PDF**, a distribuição cai no caminho legado `dropToFit`, que ordena treinos por código e atribui na ordem dos dias selecionados → treinos aparecem em dias diferentes.
- Como o treino certo vai parar no dia errado, os intervalados (que variam de semana para semana) mostram conteúdo diferente do que o usuário enxergou ao editar.

Os patches de `sections` (conteúdo dos intervalados) **já são** aplicados via `applyOverrides`. O conteúdo em si não está errado — o que está errado é o **mapeamento treino↔dia**, então o treino "errado" cai em cada dia, dando a sensação de que o intervalado mudou.

## O que ajustar

Para cada uma das 4 rotas (`planilha-5km.tsx`, `planilha-10km.tsx`, `planilha-21km.tsx`, `planilha-42km.tsx`):

1. No `useMemo` que monta `weeks`, antes de chamar `distributeWeek`:
   - Pegar o `weekObj` de overrides daquela fase/semana.
   - Construir `manualDayByCode` via `getManualDayMap(weekObj, rawList)` (já existe em `src/lib/workout-overrides.ts`).
   - Chamar `distributeWeek(applied, weekDays, level, typesMap, { manualDayByCode, noDrop: true })`.
2. Com isso, `weeks` (que já é o que `handleExportPdf` envia para `generatePlanilha*kmPdf`) passa a refletir exatamente o mesmo layout do customizer — sem necessidade de mudar o gerador de PDF.
3. Como `noDrop: true` pode produzir `unassigned` (treinos sem dia), exibir uma faixa pequena "Treinos sem dia" acima da grade da semana na tela principal (mesmo padrão visual já usado no customizer), para o usuário saber que existem treinos não alocados antes de gerar o PDF. No PDF, esses treinos ficam fora — comportamento já existente.

## Arquivos a editar

- `src/routes/_authenticated/planilha-5km.tsx`
- `src/routes/_authenticated/planilha-10km.tsx`
- `src/routes/_authenticated/planilha-21km.tsx`
- `src/routes/_authenticated/planilha-42km.tsx`

Sem mudanças em `planilha-pdf-theme.ts`, `planilha-*-distribute.ts` nem `workout-overrides.ts` — a infra já suporta o caminho correto, só não estava sendo usada na tela principal/PDF.

## Fora de escopo

- Layout do PDF.
- Lógica de `dropToFit` (mantida como fallback).
- Aviso de treinos intensos consecutivos (já removido em ajuste anterior).
