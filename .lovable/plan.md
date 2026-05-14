# Plano — Planilha 42km (Maratona)

Replicar a arquitetura já consolidada da Planilha 21km, adaptando volume, tipos de treino e prova final (42.195m).

## Arquitetura (espelha 21km)

Banco de dados: `plan_type` enum já contém `'42km'`. Persistência em `training_plans.payload` (mesma tabela usada por 5/10/21km), nenhuma migration necessária.

## Arquivos a criar

```text
src/lib/planilha-42km-data.ts          # 2 níveis × 5 planilhas × 4 semanas × 4 slots
src/lib/planilha-42km-distribute.ts    # validação: sempre 4 dias
src/lib/planilha-42km-stats.ts         # cálculo de duração/volume por FTP (cópia adaptada)
src/lib/planilha-42km-pdf.ts           # geração PDF (cópia adaptada do 21km)
src/lib/planilha-42km.functions.ts     # serverFns get/save (plan_type='42km')
src/routes/_authenticated/planilha-42km.tsx   # substitui o placeholder atual
```

## Banco de treinos (`planilha-42km-data.ts`)

Reutilizar os builders do 21km (`progressivo`, `corridaRapida`, `subidasSec/Min`, `tempoRun`, `intervaladoLongo/Moderado/Curto`, `corridaRapidaLonga`, `regenerativo`, `baseAerobia`, `longaoDist`, `progressivoLongo`, `teste3km`). Adicionar:

- `prova42km(code, slot, z2m, z3m)` — análogo a `simulado21km`, mas com label "PROVA 42KM" e nota "Prova de Maratona — 42.195m total". Estrutura padrão: `1000m Z1 + 39000m Z2 + 3195m Z3`.
- Novo tipo no enum `WorkoutType42km`: adicionar `"Prova 42km"` em vez de `"Simulado 21km"`. Restante igual.

Cinco planilhas por nível, conforme dados fornecidos pelo usuário:

- **N1_P1..P3**: Preparação Geral (mesmos tipos de treino do briefing).
- **N1_P4 e N1_P5**: Preparação Específica. Sem 4 / Slot 4 = `prova42km`. Sem 4 / Slot 1 = `teste3km`.
- **N2_P1..P3**: Preparação Geral, volume maior. P2 Sem 4 / Slot 1 = `teste3km`.
- **N2_P4**: Específica com `teste3km` na Sem 4 Slot 1 (sem prova).
- **N2_P5**: Específica com **PROVA 42km** na Sem 4 Slot 4.

Distribuição de slots em todas as semanas: Slot 1 = TER, Slot 2 = QUI, Slot 3 = SEX (regenerativo), Slot 4 = SAB (longão / CR longa / progressivo longo / prova).

## Distribuição de dias (`planilha-42km-distribute.ts`)

Sempre 4 dias (qualquer nível). Default: `["TER","QUI","SEX","SAB"]`. Mesmo padrão do 21km.

## Stats / PDF / serverFns

Cópias diretas dos arquivos `planilha-21km-*` com renomeações:
- `makeStatsLookup42km`, `generatePlanilha42kmPdf`, `getPlanilha42kmData`, `savePlanilha42kmConfig`.
- `plan_type` nas queries: `'42km'`.
- Título do PDF: "Planilha 42km — Maratona".

## Rota (`src/routes/_authenticated/planilha-42km.tsx`)

Substituir o placeholder atual. Cópia da página 21km com:
- Imports apontando para os módulos `*-42km*`.
- Título "Planilha 42KM — Maratona".
- Texto da prova final: "PROVA 42KM — 42.195m" (no destaque visual da Sem 4 Slot 4 das P4/P5 N1 e P5 N2).
- Aviso do Teste 3km mantido idêntico.

## Comportamentos UI/UX (todos já presentes no 21km, herdados)

Seleção de nível/planilha, entrada de FTP com cálculo automático de zonas, calendário semanal SEG–DOM com OFFs fixos, card de treino com Aquecimento/Principal/Recuperação, destaque do Teste 3km e da Prova, totais (volume, duração, % L vs % M/H), 5 lembretes fixos, macro view por planilha — tudo já implementado na rota base copiada.

## Verificação pós-implementação

1. Build limpo (sem imports quebrados, sem chain de `createServerFn` quebrada).
2. Acessar `/planilha-42km`, configurar nível/dias/FTP, navegar pelas 5 planilhas × 4 semanas e conferir:
   - Aquecimentos das CR Longas: 800m Z1 + 1600m Z2 (exceto N2 P5 Sem 1: 1600m Z1 + 1600m Z2).
   - Sem 4 P4/P5 N1 e P5 N2: Slot 4 marcado como **PROVA 42KM** com 1000m Z1 + 39000m Z2 + 3195m Z3.
   - Teste 3km destacado nas semanas indicadas.
3. Exportar PDF de ao menos uma planilha completa e conferir layout.

## Notas técnicas

- Nenhuma migration necessária (`plan_type` já tem `'42km'`).
- Sidebar já tem entrada para `planilha-42km` apontando para a rota; nada a alterar lá.
- Reuso máximo de tipos do `planilha-5km-data.ts` (`Item`, `Section`, `ZoneId`, `DayCode`, etc.) via re-export, igual ao 21km.
