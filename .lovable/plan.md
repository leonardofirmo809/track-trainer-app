## Correção da estrutura das Planilhas 42km

A implementação atual coloca a PROVA na Semana 4 da Planilha 4 (N1_P4 e N2_P5) e duplica N1_P5 como cópia da P4. Isso viola a regra: prova só na **Semana 4 da Planilha 5**, nunca na Planilha 4.

### Mudanças em `src/lib/planilha-42km-data.ts`

**Nível 1 — N1_P4 (Semana 4)** — remover prova, virar tapering com Teste 3km no T14:
- T13 (TER): `regenerativo(40)`
- T14 (QUI): `teste3km` ← era T13
- T15 (SEX): `regenerativo(40)`
- T16 (SAB): `longaoDist(20)` (longão, não prova)

**Nível 1 — N1_P5** — substituir a cópia atual por uma planilha real de polimento + prova:
- Sem 1: tapering moderado (tempo run, intervalado curto, regenerativo, longão médio ~22km)
- Sem 2: redução de volume (base aeróbia, intervalado leve, regenerativo, longão ~16km)
- Sem 3: polimento (tempo run curto, CR curto, regenerativo, longão curto ~12km)
- Sem 4 (semana da prova):
  - T13 (TER): `corridaRapida` curto
  - T14 (QUI): `regenerativo(50)`
  - T15 (SEX): `regenerativo(30, "Pré-prova")`
  - T16 (SAB): `prova42km(39000, 3195)` — 1km Z1 + 39km Z2 + 3,195km Z3

**Nível 2 — N2_P4 (Semana 4)** — manter como já está (Teste 3km T13, regen, regen, progressivo longo). Garantir que **não há prova**.

**Nível 2 — N2_P5 (Semana 4)** — já está correta (T13 CR, T14 Regen 50, T15 Regen 30, T16 Prova). Conferir e manter.

### Ajustes auxiliares

- **`PHASE_LABELS_42KM`**: confirmar P4 = "Preparação Específica", P5 = "Polimento / Prova".
- **`src/routes/_authenticated/planilha-42km.tsx`**: o destaque visual "PROVA 42KM" deve aparecer **apenas** na Sem 4 / Slot 4 da Planilha 5 (ambos os níveis). Remover qualquer destaque de prova na Planilha 4.
- **`.lovable/plan.md`**: atualizar a descrição (item que diz "Sem 4 P4/P5 N1 e P5 N2") para refletir que a prova está só em P5.

### Verificação pós-fix

1. N1_P4 Sem 4 e N2_P4 Sem 4: nenhum workout do tipo `"Prova 42km"`.
2. N1_P5 Sem 4 Slot 4 e N2_P5 Sem 4 Slot 4: exatamente um `prova42km` com `1000m Z1 + 39000m Z2 + 3195m Z3`.
3. Teste 3km presente em N1_P4 Sem 4 (T14), N2_P2 Sem 4 (T13) e N2_P4 Sem 4 (T13) — não em P5.
4. UI: badge "PROVA" só aparece em P5 Sem 4.

### Pergunta antes de implementar

A Planilha 5 do **Nível 1** precisa de conteúdo real para Sem 1–3 (a versão atual é uma cópia da P4). Posso usar a estrutura do N2_P5 como base (mesmos tipos de treino, volumes ~15% menores) ou você quer enviar os treinos exatos das semanas 1–3 da P5 N1?