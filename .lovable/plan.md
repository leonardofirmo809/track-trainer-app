# Planilha 10KM — replicar estrutura do 5KM

A tela 10KM reaproveita 100% do layout, fluxo (seleção de aluno → validação FTP → configuração → fases/semanas → modal de detalhes → PDF) e gráficos já existentes na 5KM. Apenas troca o **banco de treinos**, **tabela duração/volume** e **rótulos** (incluindo um novo tipo "Simulado 10km" e os novos tipos exclusivos do 10km).

A entrada do menu lateral `Planilha 10KM` já existe (apontando para um placeholder) e será substituída pela tela real.

## Arquivos novos

1. **`src/lib/planilha-10km-data.ts`**
   - Mesmos tipos exportados pelo 5km (`DayCode`, `ZoneId`, `Workout`, `PhaseWeeks`, `WORKOUT_TYPES`, `PHASE_LABELS`, `defaultDaysFor`, `DAY_ORDER/DAY_LABEL/DAY_FULL`).
   - Adiciona 3 novos `WorkoutType`: `"Intervalado Moderado"`, `"Corrida Rápida Longa"`, `"Simulado 10km"` (cores no padrão dos análogos 5km — laranja/amarelo). `"Tempo Run"` cobre o "Temple Run" do enunciado.
   - `WORKOUTS = { 1: LEVEL_1, 2: LEVEL_2 }` com 4 fases × 4 semanas, codificando exatamente os treinos descritos no enunciado:
     - Nível 1 (3x/sem TER/QUI/SAB), Nível 2 (4x/sem TER/QUI/SEX/SAB).
     - Sessões `warmup` / `main` / `recovery` montadas de forma que a soma de minutos por zona produza os percentuais de referência informados (Z1≈52/35/9/4/0 etc.). Para tipos especiais:
       - **Intervalado Moderado**: warmup `5min Z1 + 5min Z2`, main `iv(N, on=3–4min Z4, off=2min Z1)`, recovery `5min Z1`.
       - **Corrida Rápida Longa**: warmup `800m Z1 + 1600m Z2`, main `iv(N, on=5min Z4, off=2min Z1)`, recovery `5min Z1`.
       - **Simulado 10km**: warmup `1000m Z1`, main `s(8000m, Z3) + s(1000m, Z4)`.
     - Longões do Nível 2 escalam até 16km na F4 (segmentos `2km Z1 + Xkm Z2 + 2km Z1`).

2. **`src/lib/planilha-10km-volumes.ts`**
   - Mesma estrutura de `planilha-5km-volumes.ts`: `WORKOUT_STATS[level][phase][weekIdx][code] = { durationMin, volumeM, label? }` com os números **exatos** das tabelas do enunciado (T01..T12 nível 1 / T01..T16 nível 2 por fase).
   - Reexporta `formatHm` e `formatKm` (importa de `planilha-5km-volumes` para não duplicar) e expõe um `getStats10km(level, phase, weekIdx, code)`.

3. **`src/lib/planilha-10km.functions.ts`**
   - Cópia de `planilha-5km.functions.ts` trocando `plan_type: "5km"` → `"10km"` em `getPlanilha10kmData` e `savePlanilha10kmConfig`. Mantém o mesmo schema de `payload` e a mesma checagem de acesso ao aluno. Não requer mudança de schema (a coluna `plan_type` já é livre).

4. **`src/lib/planilha-10km-pdf.ts`**
   - Cópia de `planilha-5km-pdf.ts` chamando `getStats10km`/`WORKOUTS` da 10km e título "Planilha 10KM" no cabeçalho. Demais layout/branding inalterado.

5. **`src/routes/_authenticated/planilha-10km.tsx`**
   - Cópia de `planilha-5km.tsx` com:
     - Imports apontando para os módulos `*-10km` (data, volumes, functions, pdf).
     - `Route = createFileRoute("/_authenticated/planilha-10km")`.
     - Title/breadcrumb `Planilha 10KM`; nome do PDF `Planilha-10km-{aluno}-Fase{n}.pdf`.
     - Mantém: gráficos `WeekVolumeChart`/`WeekIntensityChart`/`WeekTotalsCard`, modal de detalhes, validação de FTP/teste 3km ausente, alerta de treinos intensos consecutivos, persistência automática.
   - Substitui o placeholder atual em `src/routes/_authenticated/planilha-10km.tsx`.

## Refator mínimo (compartilhar lógica de gráficos)

Para os gráficos funcionarem com o banco do 10km, `computeWeekTotals` / `computeWorkoutTotals` (em `planilha-5km-zone-distribution.ts`) precisam aceitar o `getStats` correto.

- Renomear o arquivo para algo neutro **não é necessário** — basta tornar as duas funções genéricas:
  - Adicionar parâmetro opcional `statsLookup?: (level, phase, weekIdx, code) => { durationMin, volumeM } | null`.
  - Default = `getStats` do 5km (preserva chamadas existentes).
  - Tela 10km passa `getStats10km`.
- `distributeWeek` (já em `planilha-5km-distribute.ts`) é puramente sobre `Workout`/`DayCode` e funciona como está; será importado direto pela tela 10km.
- `WORKOUT_TYPES` da 10km estende com os 3 novos tipos; `distributeWeek` usa `WORKOUT_TYPES` importado de `planilha-5km-data`. Para evitar acoplamento, tornar `distributeWeek` genérico aceitando um `typesMap` (com default = `WORKOUT_TYPES` 5km) — usado apenas para `intense` e `KEEP_PRIORITY`. `KEEP_PRIORITY` ganha entradas para os novos tipos (Intervalado Moderado=76, Corrida Rápida Longa=82, Simulado 10km=90).

## Fora de escopo

- Schema de banco (reaproveita `training_plans` com `plan_type='10km'`).
- Mudanças visuais nos gráficos da 5km.
- Planilhas 21km/42km.

## Validação

- Após implementar, abrir `/planilha-10km`, selecionar um aluno com Teste 3km, aplicar Nível 1 / Fase 1 e conferir os percentuais por semana contra os valores de referência (Z1≈52/35/9/4/0 etc.).
- Exportar PDF e checar que os cards de duração/volume batem com a tabela do enunciado.
