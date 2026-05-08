# Planilha 5KM — duração/volume nos cards + gráfico de zonas + resumo semanal

Três adições ao card 4 ("Fase e treinos") da rota `/planilha-5km`. Sem alterações no PDF, banco ou backend.

## Arquivos

1. **Novo** `src/lib/planilha-5km-volumes.ts`
   - Tabela `WORKOUT_STATS[level][phase][weekIdx][code] = { durationMin, volumeM, label? }` exatamente como fornecido (Nível 1 e 2, 4 fases × 4 semanas).
   - Helper `getStats(level, phase, weekIdx, code)`.
   - Helpers de formatação: `formatHm(min)` ("1h 22min" / "27 min") e `formatKm(m)` ("4,3 km").

2. **Novo** `src/lib/planilha-5km-zone-distribution.ts`
   - `computeWeekZoneMinutes(week, level, phase, weekIdx)` → `{ Z1, Z2, Z3, Z4, Z5 }` em minutos.
   - Algoritmo (por treino, percorrendo `workout.sections[].items`):
     - `single` em `min` → soma `value` na zona.
     - `single` em `sec` → soma `value/60` na zona.
     - `intervals` → `reps * (on + off em min)`, somando cada um na sua zona.
     - `single`/`test` em `m` (Longão, Teste, Simulado): distribuir o `durationMin` do `WORKOUT_STATS` proporcionalmente aos metros entre os itens em metros do mesmo treino, e atribuir cada fatia à zona do item (Teste 3km vai para Z3 conforme regra do enunciado; itens em metros sem zona explícita não existem na base atual).
   - `computeWeekZonePercent(...)` retorna `{ Z1..Z5 }` somando 100%.
   - `computeWeekTotals(week, level, phase, weekIdx)` → `{ totalMin, totalKm, lightPct, hardPct }` (leve = Z1+Z2; médio/alto = Z3+Z4+Z5).

3. **Editar** `src/routes/_authenticated/planilha-5km.tsx`
   - No componente `WeekRow`, abaixo do grid de cards de treino, renderizar:
     - **Sub-info dentro de cada card de treino**: linha com `<Clock /> {duração}` + separador + `<Route /> {volume km}` (ícones Lucide), abaixo de `wo.type`. Dados via `getStats(level, phase, weekIdx, wo.code)`.
     - **Resumo semanal** (`WeekSummaryCards`): 4 cards horizontais (em uma linha que se ajusta) por semana — só os da semana atual:
       - Total: `formatHm(totalMin)`
       - Volume: `formatKm(totalM)`
       - Intensidade: `lightPct% Leve` / `hardPct% Médio/Alto`
     - **Gráfico de zonas** (`WeekZoneChart`): barra horizontal 100% empilhada da semana, usando `recharts` (`BarChart` com `layout="vertical"`).
       - 1 barra (Y = "Semana N"), 5 segmentos `Bar dataKey="Z1..Z5" stackId="zones"`.
       - Cores via tokens semânticos definidos em `src/styles.css` (ver abaixo).
       - `Tooltip` formatado: `Z2 — 33% — 28 min`.
       - Legenda horizontal Z1…Z5.
   - Como `WeekRow` precisa saber `level`, `phase` e `weekIdx`, passar essas props no `weeks.map(...)` do componente principal.

4. **Editar** `src/styles.css`
   - Adicionar tokens de cor para zonas (modo claro e escuro):
     `--zone-1` (verde claro), `--zone-2` (verde), `--zone-3` (amarelo), `--zone-4` (laranja), `--zone-5` (vermelho).
   - Mapear para classes Tailwind via `@theme` para uso no Recharts (`fill: hsl(var(--zone-1))`).

## Comportamento e UX

- A sub-info (duração/volume) aparece em todos os cards de treino, sem mudar o tamanho do card (usar texto `text-[11px]`).
- Os 4 cards de resumo ficam logo abaixo da grid de cards de treino e acima do gráfico.
- O gráfico tem altura fixa (~80px) e título `Distribuição de Intensidade — Fase {phase}` (apenas na primeira semana, para não repetir; ou em cada semana — ver pergunta abaixo).
- Animação padrão do Recharts (já suave) ao montar.

## Validação

- Conferir contra os valores de referência do enunciado (N1 F1: S1 Z1≈57%, Z2≈33%, Z4≈10%) — tolerância ±2 pontos percentuais.

## Fora de escopo

- PDF (não exportar duração/volume nem o gráfico no PDF nesta entrega).
- Edição/persistência de duração/volume no banco.
- Mudanças nos níveis/fases/treinos existentes em `planilha-5km-data.ts`.
