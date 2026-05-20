## Objetivo

Hoje o Nível 1 da Planilha 10km tem apenas **1 plano único** de 4 semanas (3 treinos/semana), replicado nas 4 chaves de fase, e a UI esconde as abas. Vamos transformar em **4 planos distintos** (Plano 1 → 4) com progressão didática, e exibir as abas igual ao Nível 2 e às outras planilhas.

Escopo: somente dados de treino + renderização das abas. Sem mudança em distribuição, PDF, banco, schema, ou personalização.

## Progressão proposta (N1, 3 treinos/semana)

Mesma filosofia do N2 (Geral → Específico → Avançado → Polimento), porém com volumes/intensidades menores adequados a iniciante. Cada plano tem 4 semanas × 3 slots.

**Plano 1 — Preparação Geral** (adaptação aeróbia)
- Slot 1: Progressivo curto (Z1→Z2→Z3 leve), 35–45 min, Z3 5–10 min
- Slot 2: Corrida Rápida em blocos curtos (Z4), 4–6 reps de 1–2 min com pausa 2 min
- Slot 3: Longão por tempo (Z2), 25–40 min

**Plano 2 — Preparação Específica** (introdução de força/intervalado leve)
- Slot 1: Progressivo + Subidas curtas (Z5) alternando semanas
- Slot 2: Intervalado Moderado (Z3), 3–4 reps de 5–8 min
- Slot 3: Longão por tempo, 35–50 min

**Plano 3 — Específico Avançado** (qualidade)
- Slot 1: Tempo Run (Z3) progressivo 12–20 min
- Slot 2: Intervalado Longo (Z4), 3–5 reps de 3–5 min
- Slot 4 da semana 4: **Teste 3km** (mantém ritual de reavaliação)
- Slot 3: Longão por tempo, 40–55 min

**Plano 4 — Polimento / Prova** (taper + simulado)
- Sem 1: Tempo Run + Intervalado Longo curto + Longão 50 min
- Sem 2: Corrida Rápida + Regenerativo + **Simulado 5km**
- Sem 3: Intervalado Longo curto + Regenerativo + Progressivo
- Sem 4 (semana da prova): Corrida Rápida bem leve + Regenerativo + **Simulado 10km**

Notas: todos os blocos usam os builders existentes (`progressivo`, `corridaRapida`, `subidasMin/Sec`, `tempoRun`, `intervaladoLongo/Moderado`, `longaoTempo`, `regenerativo`, `teste3km`, `simulado5km`, `simulado10km`), mantendo zonas/cores/intensidades já tipadas. Sem novos tipos de treino.

## Mudanças técnicas

1. **`src/lib/planilha-10km-data.ts`**
   - Substituir `PLAN_LEVEL_1_WEEKS` único + `LEVEL_1_10KM = {1:..,2:..,3:..,4:..}` replicado por 4 planos distintos `N1_P1`, `N1_P2`, `N1_P3`, `N1_P4` (3 slots/semana × 4 semanas), montados com os builders já existentes seguindo a progressão acima.
   - `LEVEL_1_10KM: PhasesByLevel10km = { 1: N1_P1, 2: N1_P2, 3: N1_P3, 4: N1_P4 }`.
   - Remover o comentário "a UI esconde abas para N1".

2. **`src/routes/_authenticated/planilha-10km.tsx`**
   - No card 4, eliminar o ramo `level === 1 ? <bloco único> : <Tabs>` e usar sempre o ramo de `Tabs` com `Plano 1–4` (já igual ao N2).
   - Em `useEffect` de pré-carregar payload e em `setLevel` (Card 3), remover a coerção `phase = 1` quando `level === 1` (deixar a fase salva válida).
   - `changePhase` permanece igual.

3. **`src/lib/planilha-10km.functions.ts`**
   - No `configSchema.refine`, remover a regra que força `currentPhase === 1` quando `level === 1` (passa a aceitar 1–4).
   - No `savePlanilha10kmConfig.handler`, trocar `currentPhase: data.level === 1 ? 1 : data.currentPhase` por `currentPhase: data.currentPhase`.
   - Planos salvos antigos com `currentPhase: 1` continuam válidos (default).

## Fora de escopo

- PDF (`planilha-10km-pdf.ts`), distribuição (`planilha-5km-distribute.ts`), personalização (`PrescricaoEditor`), estatísticas/zonas, banco e RLS.
- Mudanças visuais fora do Card 4 do 10km.
- Outras planilhas (5km, 21km, 42km).

## Riscos / observações

- Alunos com plano N1 já salvo abrirão em "Plano 1" (compatível).
- Como cada plano agora tem treinos diferentes, trocar de plano vai mudar o que aparece na grade — comportamento desejado.
- `slotCountFor10km(1)` continua `3`, e `allowedDayCounts(1)` continua `[3]`.
