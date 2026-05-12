# Plano — Concluir Refatoração da Planilha 10km

## Contexto
A refatoração das Avaliações (4 testes) e da estrutura de dados da Planilha 10km já foi feita. Faltam: distribuição livre por dias, stats dinâmicos do FTP, UI atualizada, PDF com resumos, migração de dados existentes.

## Etapas

### 1. `src/lib/planilha-10km-distribute.ts` (novo)
- `slotCountFor(level)` → N1: 3 slots fixos; N2: 4 ou 5.
- `validateWeekDays(level, weekDays)` → tamanho exato (N1=3, N2∈{4,5}).
- `assignSlotsToDays(level, slots, weekDays)` → ordena dias da semana (DOM→SAB), atribui Slot N ao N-ésimo dia marcado.
- Regra "Regen entre intensos" (N2): se Slot 3 (Regen) cair cronologicamente antes de Slot 2 (intenso), troca posições.
- Detecção "intensos consecutivos": retorna alerta se dois treinos de qualidade (Slots 1, 2 ou 4 N2) ficarem em dias adjacentes.

### 2. `src/lib/planilha-10km-stats.ts` (novo, substitui `planilha-10km-volumes.ts`)
- `paceMedioZona(ftpSec, zona)` usa multiplicadores Z1–Z5 já definidos em `teste-3km.ts`.
- `computeItemStats(item, ftpSec)` → km e duração derivados das zonas/tempos do item.
- `computeWorkoutStats(workout, ftpSec)` → soma itens, %Z1+Z2 vs Z3+Z4+Z5.
- `computeWeekStats(week, ftpSec)` e `computePhaseStats(phase, ftpSec)`.
- Remove `WORKOUT_STATS_10KM` hard-coded; mantém arquivo antigo como re-export deprecated por 1 ciclo (ou apaga se não houver outros consumidores).

### 3. `src/routes/_authenticated/planilha-10km.tsx`
- Selector de dias livre: N1 exige exatamente 3, N2 exige 4 ou 5 (validação visual + bloqueio do botão Salvar).
- N1: ocultar abas de fase, mostrar apenas Semana 1–4 (com Teste 3km na S4 conforme já no data).
- N2: manter abas das 4 fases.
- Se `lastTest` ausente, bloquear geração com aviso "Inserir avaliação primeiro".
- Mostrar km/duração calculados dinamicamente via `planilha-10km-stats.ts`.
- Mostrar alerta "Intensos consecutivos" quando aplicável.
- Payload salvo: `{ level, weekDays, currentPhase }` (currentPhase=1 fixo em N1).

### 4. `src/lib/planilha-10km.functions.ts`
- `configSchema`: `daysPerWeek` removido/opcional, `weekDays` validado por nível (3 para N1, 4|5 para N2), `currentPhase` ∈ 1..4 (forçado a 1 quando level=1).

### 5. `src/lib/planilha-10km-pdf.ts`
- Adicionar bloco de resumo semanal (km totais, duração, %L vs %M-H) usando stats dinâmicos.
- Adicionar bloco "Total do Plano" no fim.
- Manter layout visual atual (mudanças mínimas).

### 6. Migração de planos salvos
- Ao carregar plan existente: se `weekDays` tiver tamanho incompatível com `level`, resetar para `[]` e exigir reconfiguração.
- Se `level=1` e `currentPhase>1`, forçar `currentPhase=1`.
- Sem alteração de schema no banco (payload é jsonb).

## Fora do escopo
Planilhas 5km/21km/42km, estilo visual do PDF, cron, enum `test_type` no banco.

## Validação final
- Build limpo.
- Verificar fluxo: criar avaliação (cada um dos 4 tipos) → abrir planilha 10km N1 com 3 dias → ver semanas 1–4 com stats dinâmicos → exportar PDF.
- Repetir para N2 com 4 e 5 dias.
