## Objetivo

1. Adicionar uma **data de início do treino** que seja escolhida pelo treinador na própria página da planilha e apareça no PDF.
2. Remover os rótulos "ON" e "OFF" do PDF, usando no lugar a notação de **zonas de treinamento** (Z1–Z5), igual aparece na prescrição. Trocar o "OFF" dos dias sem treino por **"DESCANSO"**.

## 1. Data de início no PDF (4 planilhas: 5/10/21/42KM)

**Onde aparece**
- Em `src/lib/planilha-pdf-theme.ts`, a linha do header hoje mostra `Gerado em DD/MM/AAAA  •  Nível ...`.
- Vamos passar a mostrar `Início em DD/MM/AAAA  •  Nível ...`, usando a data escolhida pelo treinador.

**Campo na página**
- Em cada uma das 4 rotas `src/routes/_authenticated/planilha-{5,10,21,42}km.tsx`, adicionar um input de data (shadcn DatePicker em popover) com label "Data de início do treino", próximo ao botão "Exportar PDF".
- Valor inicial: `training_plans.start_date` se existir, senão `training_plans.created_at`, senão hoje.
- Ao mudar a data, salvar imediatamente em `training_plans.start_date` (debounce curto) via uma server function nova, e atualizar o cache do React Query da planilha.
- No `handleExportPdf`, passar essa data como `generatedAt` para o gerador de PDF (substitui o `created_at` atual).

**Server function nova**
- `src/lib/plan-customization.functions.ts` (ou um arquivo irmão `plan-start-date.functions.ts`): `updatePlanStartDate({ planId, startDate })` protegida por `requireSupabaseAuth`, faz `update training_plans set start_date = ... where id = planId and coach_id = auth.uid()`.

**Renderer**
- `renderPlanilhaPdf` (em `planilha-pdf-theme.ts`):
  - Trocar o texto `Gerado em ${today}` por `Início em ${startDate}`.
  - Continuar aceitando `generatedAt`; renomear internamente para `startDate` é opcional — não precisa quebrar a assinatura pública agora.

## 2. Remover ON/OFF — usar zonas como na prescrição

**Intervalos** (em `src/lib/planilha-pdf-theme.ts`, função `itemLeft`, linhas 132–143):

Hoje:
```
6× (1min ON + 1min OFF)
```

Passa a ser (zona inline, sem ON/OFF):
```
6× (1min Z4 + 1min Z1)
```

A zona do trecho `off` já existe em `AnyIntervals.off.zone`. Vamos exibir cada bloco com sua própria zona em formato igual ao da prescrição. A badge colorida da zona à esquerda do item passa a ser composta (ex.: `[Z4]` e `[Z1]`), na mesma linha, mantendo as cores do `ZONE_PALETTE`.

A coluna da direita (`itemRight`) hoje mostra `ON Z4: pace/vel`. Passa a mostrar a faixa da zona principal sem o prefixo "ON" — apenas `Z4 — pace/vel`, mantendo o range já calculado.

**Dias sem treino** (mesmo arquivo, ~linha 393):

Hoje:
```
QUARTA-FEIRA — OFF
```
Passa a ser:
```
QUARTA-FEIRA — DESCANSO
```

## Fora de escopo

- PDF do Teste 3KM (já foi ajustado em turno anterior).
- Layout geral do PDF, cores, fontes.
- Edição de treinos / lógica de prescrição.
- Migração de banco (a coluna `training_plans.start_date` já existe).
