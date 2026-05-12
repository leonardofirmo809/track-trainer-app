## Escopo

Reescrever a Planilha 10km segundo a nova especificação e estender o módulo Teste 3km para aceitar 4 tipos de avaliação. Fora de escopo: planilhas 5km, 21km e 42km, layout do PDF (já refeito). PDF ganha apenas conteúdo novo (resumo semanal, total e lembretes).

---

## 1. Avaliações (Teste 3km → "Avaliação")

Arquivo: `src/lib/teste-3km.ts` e `src/routes/_authenticated/teste-3km.tsx`.

- Manter `calcularTeste3km` e adicionar 3 funções novas que devolvem o mesmo `Teste3kmResult` (FTP em seg/km + zonas):
  - `calcularProva5km(seconds)` → `FTP = (s/5) * 1.0566`
  - `calcularProva10km(seconds)` → `FTP = (s/10) * 1.0566`
  - `calcularCooper12min(meters)` → `FTP = (720 / m * 1000) * 1.0566`
- Tela de Teste 3km vira "Avaliação": tabs com 4 tipos (3km mm:ss, 5km mm:ss, 10km hh:mm:ss, Cooper metros). Cada submit gera o mesmo objeto e grava em `tests` (campo `test_type` continua aceitando `3km`; novos tipos vão como `metadata.source` para não exigir migração agora).
- Validar limites razoáveis por tipo (3km 10–40min, 5km 14–60min, 10km 30–120min, Cooper 1000–5000m).
- Os helpers de zona (`ZONE_DEFS`) mudam para os multiplicadores da spec:
  - Z1: 1.670 → 1.3156 (PSE 1–2)
  - Z2: 1.3156 → 1.150 (PSE 3–4)
  - Z3: 1.0754 → 1.000 (PSE 5–6)
  - Z4: 0.9783 → 0.870 (PSE 7–8)
  - Z5: 0.870 → Máx (PSE 9–10)
  - Pace = FTP × multiplicador. "De" = mais lento (mult maior), "Até" = mais rápido (mult menor). Velocidade = 60 / pace_min.

Impacto: Planilha 5km também usa essas zonas — confirmaremos numericamente, mas hoje a 5km consome o resultado salvo em `tests.metadata.zones`, então segue funcionando com os novos cortes.

---

## 2. Modelo de dados — Planilha 10km

Arquivo: `src/lib/planilha-10km-data.ts` (reescrita parcial).

- **Slots ao invés de dias fixos**: cada `Workout10km` ganha `slot: 1 | 2 | 3 | 4 | 5` em vez de `defaultDay`.
- **Templates da spec** (alguns recalibrados, conforme Passos 4–9 do prompt). Mantém builders existentes (`progressivo`, `corridaRapida`, `subidas`, `tempoRun`, `intervaladoLongo`, `intervaladoModerado`, `regenerativo`, `corridaRapidaLonga`) e adiciona/ajusta:
  - `longaoTempo(min)` — Longão por tempo (5min Z1 → Xmin Z2 → 5min Z1).
  - `longaoDistancia(z1AqM, z2M, z1ReM)` — exclusivo N2.
  - `simulado5km()` e `simulado10km()` conforme spec do polimento.
  - `teste3km()` continua, com note exata da spec ("Percurso PLANO! ...").
- **Bancos de treinos** reescritos exatamente conforme spec:
  - `LEVEL_1_10KM`: **1 plano** com 4 semanas (3 slots por semana) — Passo 5.
  - `LEVEL_2_10KM`: **4 planos** (Geral, Específico, Avançado, Polimento), cada um com 4 semanas e 4 slots — Passos 6–9. Sem Slot 5 nesta versão (a spec descreve 4 ou 5 dias, mas as tabelas usam 4 slots; o Slot 5 só é gerado quando o professor marca 5 dias — ver §3).
- `defaultDaysFor10km` removido; `slotCountFor(level)` retorna `3` para N1 e `[4, 5]` para N2.

---

## 3. Distribuição livre por dias (Slots → Dias)

Novo arquivo: `src/lib/planilha-10km-distribute.ts` (não reaproveita `planilha-5km-distribute` para evitar regressão).

Regras:
- Entrada: `weekDays: DayCode[]` marcados pelo professor + lista de workouts do banco em ordem de slot.
- Ordena `weekDays` na ordem `SEG..DOM` (`DAY_ORDER`).
- N1: exige exatamente 3 dias. Atribui workout do Slot 1 ao 1º dia, Slot 2 ao 2º, Slot 3 (Longão) ao 3º.
- N2: exige 4 ou 5 dias.
  - 4 dias: Slot 1 → 1º, Slot 2 → 2º, Slot 3 (Regen) → 3º, Slot 4 (Longão) → 4º.
  - 5 dias: Slot 1 → 1º, Slot 2 → 2º, Slot 3 (Regen) → 3º, Slot 4 (Longão) → 4º, Slot 5 (Regen extra) → 5º. O Regen extra é um Regenerativo de 30min Z1 derivado dinamicamente (não existe no banco; gerado pelo distributor).
  - Garantia "Regen entre intensos": se a posição cronológica do Regen (Slot 3) cair antes do Slot 2 cronológico, mover o Regen para entre os dois treinos de qualidade. Implementação simples: detectar e trocar.
- Dias não marcados → `assignment.workout = null` (OFF).
- Detecção de "intensos consecutivos": se dois dias adjacentes em `weekDays` ambos têm workout com `intense=true`, marcar `hasConsecutiveIntense=true` e exibir alerta "⚠️ Recomendamos ao menos 1 dia de descanso entre sessões de qualidade."

---

## 4. Volumes e durações dinâmicas

Substituir `planilha-10km-volumes.ts` por cálculo derivado das zonas do aluno.

Novo módulo `src/lib/planilha-10km-stats.ts`:
- `paceMedioZona(zoneId, zones): number` — média entre `paceSlowSec` e `paceFastSec` em seg/km. Z5 trata `paceFastSec=null` usando `paceSlowSec * 0.85` (heurística para "Máx").
- `computeItemStats(item, zones)`:
  - `single` em min: `volumeM = (value * 60 / paceMedioSec) * 1000`; `durationSec = value * 60`.
  - `single` em sec: idem com `value` direto.
  - `single` em m: `volumeM = value`; `durationSec = value / 1000 * paceMedioSec`.
  - `intervals`: aplica fórmula a `on` e `off` × `reps`.
  - `test`: `volumeM = meters`; `durationSec = meters / 1000 * paceMedioZ5*0.95` (esforço máx).
- `computeWorkoutStats(workout, zones)` → `{ durationSec, volumeM, perZoneSec: Record<ZoneId, number> }`.
- `computeWeekStats(week, zones)` → soma + `lightPct` (Z1+Z2) e `hardPct` (Z3+Z4+Z5).
- `computePhaseStats(weeks, zones)` → totais do plano (4 semanas).

A página passa a ler tudo deste módulo. `planilha-5km-zone-distribution` continua intacto para a Planilha 5km.

---

## 5. Tela `/_authenticated/planilha-10km`

`src/routes/_authenticated/planilha-10km.tsx`:

- **Card 3 — Configuração**:
  - Nível (tabs N1/N2). Trocar de nível reseta `weekDays`.
  - N1: subtítulo "Marque 3 dias da semana". Checkboxes habilitados; valida exatamente 3.
  - N2: subtítulo "Marque 4 ou 5 dias". Checkboxes habilitados; valida 4 ou 5.
  - Mensagem de erro embaixo se não bater.
  - Remover spinner/“Dias por semana”.
- **Card 4 — Fase e treinos**:
  - N1: esconder as abas de fase; renderizar diretamente as 4 semanas do único plano. PDF passa `currentPhase` como `1` mas título do PDF não menciona "Fase".
  - N2: manter 4 abas com nomes da spec (Geral / Específico / Avançado / Polimento).
  - Embaixo de cada semana: linha "Volume X,XX km • Duração HH:MM • L XX% / M-H YY%" usando o módulo dinâmico.
  - Embaixo da fase: "Total do plano: XX,XX km • HH:MM".
- **Schema do payload salvo**: `{ level, weekDays, currentPhase }` (remover `daysPerWeek`; backfill no load: se vier um plano antigo, derivar do tamanho de `weekDays`).
- **Validação ao Aplicar**: bloqueia se a contagem de dias não bater com o nível. Mantém alert dialog para intensos consecutivos.
- **Recalcular ao novo teste**: já é automático — a query `getPlanilha10kmData` re-busca o último teste e re-renderiza zonas; o módulo dinâmico recompõe paces.

---

## 6. Server function

`src/lib/planilha-10km.functions.ts`:
- `configSchema`: tornar `daysPerWeek` opcional (compat) e validar `weekDays.length` por nível (3 para N1, 4 ou 5 para N2). Manter campos persistidos.

---

## 7. PDF da Planilha 10km

`src/lib/planilha-10km-pdf.ts` — mudanças mínimas, só conteúdo:
- Para cada semana, após os treinos: bloco "Resumo: X,XX km • HH:MM • Z1+Z2 XX% / Z3+Z4+Z5 YY%".
- Após a última semana: bloco "Total do plano: X,XX km • HH:MM".
- Bloco final fixo "LEMBRAR SEMPRE!" com os 5 bullets da spec.
- Para N1, omitir referência a "Fase" no subtítulo do header.

---

## 8. Migração de planos antigos

Ao carregar `plan.payload`:
- Se `weekDays` divergir do nível ou tiver tamanho inválido, resetar para vazio e desmarcar `applied` (forçar professor a reconfigurar).
- Se `currentPhase` vier > 1 e nível for 1, forçar `1`.

---

## Detalhes técnicos

- A tabela 5km (`planilha-5km.tsx`) **não muda**. Continua travada, conforme decisão anterior.
- Zonas novas (multiplicadores) afetam paces de planos 5km antigos — aceitável porque os paces são re-renderizados toda vez que a tela monta a partir do `tests.metadata.zones` salvo (que é gravado no submit do teste). Planos pré-existentes continuam mostrando as zonas de quando o teste foi feito; novos testes usam os novos multiplicadores.
- Sem alterações de schema do banco. `tests.metadata.zones` continua sendo a fonte de verdade.
- Sem novos imports server-only no client.

## Fora de escopo

- Planilhas 5km / 21km / 42km.
- Reformulação visual do PDF além do conteúdo descrito.
- Cron / pg_cron / webhooks.
- Migração de campo `test_type` no enum (novos tipos vão em `metadata` por enquanto).
