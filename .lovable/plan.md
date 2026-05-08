# Replicar gráficos da semana no padrão da planilha

## Problema

A barra horizontal empilhada de zonas Z1–Z5 atual não corresponde ao layout da planilha de referência enviada. O modelo do cliente usa **três blocos** lado a lado abaixo dos cards de treino:

1. **Tabela "Quanto que você vai treinar"** (Total) — Volume, Duração, %L (Z1+Z2), %M/H (Z3+Z4+Z5).
2. **Gráfico VOLUME** — uma barra vertical por treino da semana, rotulada com o volume em km (ex: 14,30 km, 15,70 km…).
3. **Gráfico INTENSIDADE** — para cada treino, **duas barras verticais lado a lado**: L (azul claro) e M/H (laranja), com rótulo de % no topo (ex: 92,6% / 7,4%).

## Solução

Substituir o componente `WeekZoneChart` (barra horizontal empilhada) e o "Resumo semanal" atual por um **layout de 3 colunas** que reproduz o modelo.

### Layout (abaixo dos cards de cada semana)

```text
┌────────────────────┬───────────────────────┬───────────────────────┐
│ Quanto vai treinar │       VOLUME          │      INTENSIDADE      │
│ ────────────────── │                       │                       │
│ Volume   65,5 km   │  ▆   ▇   █   █        │  █   █   █   █        │
│ Duração  6h13      │  T1  T2  T3  T4       │  L M L M L M L M      │
│ L  89,3%           │ 14,3 15,7 17,8 17,6   │ 92  7 88 11 86 13 …   │
│ M/H 10,7%          │       (km)            │   (% por treino)      │
└────────────────────┴───────────────────────┴───────────────────────┘
```

Em telas estreitas (md e abaixo), as 3 colunas empilham verticalmente.

### 1. Card "Total" (substitui os 4 cards de resumo atuais)

Um único card com 4 linhas (Volume / Duração / L Z1+Z2 / M/H Z3+Z4+Z5), estilizado com cabeçalho destacado ("Quanto que você vai treinar") usando tokens semânticos do design system.

### 2. Gráfico VOLUME — `WeekVolumeChart`

- Recharts `BarChart` vertical (padrão), uma barra por treino da semana (T01, T02…).
- `dataKey="km"`, `Cell` colorido por treino (paleta variando como no modelo: tons de verde→azul claro→azul escuro).
- `LabelList` no topo de cada barra com o valor em km (ex: "14,30 km").
- Eixo X mostra o código do treino (T01…); eixo Y oculto.
- Sem grid pesado; tooltip com tipo de treino + km.

### 3. Gráfico INTENSIDADE — `WeekIntensityChart`

- Recharts `BarChart` vertical com **2 séries**: `light` (L = Z1+Z2 %) e `hard` (M/H = Z3+Z4+Z5 %).
- Barras agrupadas (não empilhadas — `barCategoryGap` pequeno).
- Cor L: azul claro (`--zone-2`); cor M/H: laranja (novo token `--intensity-hard`).
- `LabelList` no topo de cada barra com a % (ex: "92,6%").
- Eixo X: códigos dos treinos repetidos com sub-rótulo "L  M/H" abaixo (via `XAxis tickFormatter` ou customizado).
- Domínio Y fixo 0–100%.

### 4. Cálculo por treino

Estender `src/lib/planilha-5km-zone-distribution.ts`:

- Nova função `computeWorkoutTotals(workout, level, phase, weekIdx)` → `{ code, totalMin, totalM, lightPct, hardPct, zoneMinutes }`. Reaproveita a lógica `workoutZoneMinutes` (já existe internamente) — exportá-la.
- `computeWeekTotals` continua igual; o componente `WeekRow` chama `computeWorkoutTotals` para cada treino para alimentar os dois gráficos.

### 5. Tokens de cor

Adicionar em `src/styles.css`:
- `--volume-1` … `--volume-4` (paleta gradiente verde→azul, espelhando o modelo).
- `--intensity-light` (azul claro, pode reutilizar `--zone-2`).
- `--intensity-hard` (laranja).

### 6. Remover

- `WeekZoneChart` (barra empilhada Z1–Z5) e o array de 4 cards de resumo. Tudo é substituído pelo novo bloco de 3 colunas.

## Arquivos afetados

- `src/routes/_authenticated/planilha-5km.tsx` — substituir bloco "Resumo + WeekZoneChart" por `<WeekTotalsCard />`, `<WeekVolumeChart />`, `<WeekIntensityChart />` em grid de 3 colunas.
- `src/lib/planilha-5km-zone-distribution.ts` — exportar `workoutZoneMinutes` e adicionar `computeWorkoutTotals`.
- `src/styles.css` — adicionar tokens `--volume-*` e `--intensity-*`.

## Fora de escopo

- PDF (gráficos no PDF não mudam nesta etapa).
- Alterações nos cards de treino individuais (já têm duração + volume).
