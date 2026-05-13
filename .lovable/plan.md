## Planilha 21km — implementação completa

Espelhar a arquitetura já consolidada do módulo 10km, trocando a estrutura de planos, semanas e tipos de treino pela spec da meia maratona.

### Estrutura geral
- **Nível 1 e Nível 2**: ambos com **5 planilhas × 4 semanas × 4 slots** (sempre 4 dias/semana). Diferente do 10km, aqui N1 também tem 4 slots e múltiplas planilhas.
- Professor seleciona **exatamente 4 dias** (qualquer combinação Seg–Dom) e qual das 5 planilhas usar.
- Distribuição por slot:
  1. Slot 1 → 1º dia marcado (qualidade moderada)
  2. Slot 2 → 2º dia (qualidade alta)
  3. Slot 3 → 3º dia (regenerativo, entre os intensos)
  4. Slot 4 → último dia (longão / progressivo longo / corrida rápida longa)

### Arquivos novos

**`src/lib/planilha-21km-data.ts`**  
Banco de treinos com builders reutilizando os tipos de `planilha-5km-data` (`Section`, `Item`, `ZoneId`, etc.). Tipos extras necessários:
- `WorkoutType21km`: une os tipos do 10km + `"Progressivo Longo"`, `"Simulado 21km"`.
- Builders novos:
  - `progressivoLongo(code, slot, z1m, z2m, z3m)` — distância em metros (1000m Z1 + Xm Z2 + Ym Z3, sem recovery).
  - `simulado21km(code, slot, z1m, z2m, z3m)` — 1000m Z1 → 17000m Z2 → 4095m Z3 (Plano 5 / Sem 4).
  - `subidasMin`, `intervaladoCurto` (Z5 longo), `tempoRunLong` (variações com 10min Z1 nos avançados), `corridaRapidaLonga` (com aquecimentos 800/1600 ou 1600/1600 e recovery 800 ou 1600).
- Reutilizar `progressivo`, `corridaRapida`, `subidasSec`, `tempoRun`, `intervaladoLongo`, `intervaladoModerado`, `regenerativo`, `baseAerobia`, `longaoDist` (com aquecimento parametrizável: 1000 ou 2000m), `longaoTempo`, `teste3km`.
- `WORKOUTS_21KM[level][planoIdx]` → 5 planos por nível, cada um com 4 semanas × 4 workouts. Conteúdo exato dos Passos 5–14 da spec (preservando os números de minutos/metros/séries indicados).
- `PHASE_LABELS_21KM` para 1..5: Preparação Geral / Específica / Avançado / Específico c/ Teste / Polimento·Prova.
- Teste 3km no Slot 1, Sem 4 das Planilhas 2 e 4 (N1 e N2). Plano 5 Sem 4 → Slot 4 = Simulado 21km.

**`src/lib/planilha-21km-distribute.ts`**  
- `slotCountFor21km(level) = 4` para ambos níveis.
- `allowedDayCounts21km(level) = [4]` para ambos.
- `validateWeekDays21km(level, days)` exige exatamente 4 dias, sem duplicatas.

**`src/lib/planilha-21km-stats.ts`**  
Cópia do `planilha-10km-stats.ts` adaptada (exporta `makeStatsLookup21km` que recebe FTP em seg/km e calcula duração/volume por workout — mesma lógica de pace médio por zona).

**`src/lib/planilha-21km.functions.ts`**  
Server functions `getPlanilha21kmData` e `savePlanilha21kmConfig`, espelhando 10km. `plan_type = '21km'`, payload `{ level, weekDays, currentPhase: 1..5 }`.

**`src/lib/planilha-21km-pdf.ts`**  
Gerador de PDF mirror do 10km (mesma estrutura de cabeçalho com branding, tabela semanal, paces por zona, lembretes fixos do Passo 18). Renderiza 4 semanas do plano selecionado + total do plano.

**`src/routes/_authenticated/planilha-21km.tsx`**  
Substituir o placeholder atual. Mesma estrutura de cards do 10km (aluno → dados → configuração → fase + treinos → modal detalhe). Diferenças:
- Tabs de planilha vão de 1 a 5 (não 1 a 4) para ambos os níveis.
- Sem branch "N1 sem fases" — N1 também usa o seletor de planilhas.
- Validação: sempre 4 dias.
- Lembretes fixos do Passo 18 incluídos no PDF e no rodapé do card de treinos.

### Cálculos & polarização
- FTP e zonas: já calculados via tela `Avaliação` (Teste 3km / Prova 5km / Prova 10km / Cooper 12min). Esta planilha apenas consome `tests.metadata.zones` e `pace_seconds_per_km` do último teste.
- Volume por bloco em tempo: `min / paceMédioZona`. Por distância: `m / 1000`.
- Resumo semanal e total: reaproveitar `computeWorkoutTotals` / `computePhaseTotals` de `planilha-5km-zone-distribution` (já genéricos).

### Não muda
- Schema do DB (já existe `training_plans` com `plan_type` enum cobrindo `21km`; verificar e, se faltar, criar migration adicionando `'21km'` ao enum).
- Avisos de "treinos intensos consecutivos": **não implementar** (decisão recente para o 10km também removeu).
- Tela de Avaliação, branding, navegação.

### Verificação no final
- Selecionar aluno com teste cadastrado → trocar nível → marcar 4 dias → aplicar → ver 5 abas de planilha → trocar de plano → exportar PDF.
- Confirmar que treino "Teste 3km" aparece no Slot 1 da Sem 4 nas Planilhas 2 e 4, e Simulado 21km no Slot 4 da Plan 5 Sem 4.
