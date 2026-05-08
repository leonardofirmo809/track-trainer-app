## Objetivo

Reorganizar a seção de gráficos da Planilha 5km (e replicar em 10km) para combinar com o modelo de referência: um único bloco por **fase** com 3 colunas (Resumo / Volume / Intensidade) ao invés de bloco por semana, e adicionar % L/M-H em cada card de treino.

## Estrutura final por fase

```text
[Cards de treino — Semana 1]
[Cards de treino — Semana 2]
[Cards de treino — Semana 3]
[Cards de treino — Semana 4]

┌─────────────────────┬──────────────────┬────────────────────┐
│ Quanto que você vai │     VOLUME       │    INTENSIDADE     │
│ treinar (fase total)│  4 barras (S1-S4)│  8 barras (L+M/H   │
│                     │  km, gradiente   │  por semana)       │
│                     │  verde           │                    │
└─────────────────────┴──────────────────┴────────────────────┘
```

Os blocos por-semana (`WeekTotalsCard`/`WeekVolumeChart`/`WeekIntensityChart` por treino) são removidos. A grade de 3 colunas passa a viver no nível da **fase**, abaixo de todas as semanas.

## Mudanças

### 1. `src/lib/planilha-5km-zone-distribution.ts`
- Adicionar `computePhaseTotals(weeks, level, phase, lookup?)` que retorna:
  - `totalMin`, `totalM`
  - `lightPct`, `hardPct` (somando `zoneMinutes` de todas as 4 semanas)
  - `perWeek: { weekIdx, totalM, lightPct, hardPct }[]`
- Reaproveita `computeWeekTotals` internamente.

### 2. `src/routes/_authenticated/planilha-5km.tsx`

**`WeekRow`**:
- Remover a grade `[260px_1fr_1fr]` no fim (sai `WeekTotalsCard`/`WeekVolumeChart`/`WeekIntensityChart`).
- Manter cards de treino. Em cada card que tem `stat`, adicionar uma linha:
  ```
  <span className="text-[var(--intensity-light-fg)]">100,0% L</span> | 
  <span className="text-[var(--intensity-hard-fg)]">0,0% M/H</span>
  ```
  usando `computeWorkoutTotals` (já calculado em `perWorkout`).

**Novo bloco no `TabsContent` de cada fase** (após o `weeks.map`):
```tsx
<div className="grid gap-3 grid-cols-1 lg:grid-cols-[280px_1fr_1fr]">
  <PhaseTotalsCard totals={phaseTotals} />
  <PhaseVolumeChart perWeek={phaseTotals.perWeek} />
  <PhaseIntensityChart perWeek={phaseTotals.perWeek} />
</div>
```

**Novos componentes**:

- **`PhaseTotalsCard`**: card com header amarelo "Quanto que você vai treinar" e 4 linhas: Total Volume (`formatKm`), Total Duração (HH:MM:SS — adicionar formatter `formatHms`), L Z1+Z2 %, M/H Z3+Z4+Z5 %.

- **`PhaseVolumeChart`**: `BarChart` com 4 barras (S1..S4), eixo X = "S1".."S4", `LabelList` no topo `"X,XX km"`. Cores via gradiente verde com 4 tons (`--volume-green-1..4`).

- **`PhaseIntensityChart`**: `BarChart` com `data = [{week:"S1", L: x, MH: y}, ...]` e duas `<Bar dataKey="L">` / `<Bar dataKey="MH">` lado a lado (grouped, não stacked). `LabelList` `"X,X%"` no topo. Legenda `L = Leve | M/H = Médio/Alto` abaixo. Cores: verde (`--intensity-light`) e laranja (`--intensity-hard`).

### 3. `src/styles.css`
- Adicionar gradiente de 4 tons de verde para o gráfico de volume:
  - `--volume-green-1` (mais claro) → `--volume-green-4` (mais escuro), em `oklch`.
- Reaproveita `--intensity-light` / `--intensity-hard` já existentes.
- Adicionar `--intensity-light-fg` / `--intensity-hard-fg` (cores de texto verde/laranja para o "100,0% L | 0,0% M/H" nos cards).

### 4. `src/lib/planilha-5km-volumes.ts`
- Adicionar helper `formatHms(min: number)` retornando `HH:MM:SS`.

### 5. `src/routes/_authenticated/planilha-10km.tsx`
- Aplicar exatamente as mesmas mudanças (remover blocos por-semana, adicionar bloco por-fase, mostrar % L/M/H em cada card), passando `getStats10km` para `computePhaseTotals`.

### Fora de escopo
- PDF (mantém layout atual).
- Telas 21km / 42km (não solicitadas).
- Mudanças em `planilha-5km-data.ts` ou volumes — apenas leitura.
