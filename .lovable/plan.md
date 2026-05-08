## Objetivo

Criar a tela `/planilha-5km` (substituindo o placeholder atual) onde o professor monta a planilha de 5km de um aluno, usando FTP/zonas já salvos do último Teste 3km e personalizando paces por zona.

## 1. Dados e backend

**Origem dos dados**:
- FTP / baseSpeed / zonas → último registro em `tests` com `test_type='3km'` para o aluno (lê `metadata.zones`, `metadata.ftp_seconds_per_km`, `metadata.base_speed_kmh`).
- Configuração do plano → `training_plans` com `plan_type='5km'`, `status='ativa'`, um por aluno (upsert por `(coach_id, student_id, plan_type, status)`).

**Payload salvo em `training_plans.payload` (jsonb)**:
```json
{
  "level": 1,                 // 1 = 3x/sem, 2 = 4x/sem (escolhido na tela)
  "daysPerWeek": 3,
  "weekDays": ["TER","QUI","SAB"],
  "currentPhase": 1
}
```

**Server functions** (`src/lib/planilha-5km.functions.ts`):
- `getPlanilha5kmData({ studentId })` → middleware `requireSupabaseAuth`, retorna `{ student, latestTest, plan }`. RLS garante coach/admin.
- `savePlanilha5kmConfig({ studentId, level, daysPerWeek, weekDays, currentPhase })` → upsert em `training_plans`.

Nada de migração: schema atual já suporta.

## 2. Banco de treinos (front, estático)

Arquivo `src/lib/planilha-5km-data.ts` com:
- `WORKOUT_TYPES` → mapa tipo → `{ label, color, twClass }` (verde, azul, laranja, vermelho, cinza, roxo, laranja-escuro, verde-escuro, amarelo).
- `PHASE_LABELS` → `{ 1: "Preparação Geral", 2: "Preparação Geral (cont.)", 3: "Preparação Específica", 4: "Polimento" }`.
- `WORKOUTS_LEVEL_1` e `WORKOUTS_LEVEL_2`: estrutura
```ts
type Step = { kind: "warmup"|"main"|"recovery"|"complement"; minutes?: number; meters?: number; reps?: number; on?: {value:number, unit:"min"|"sec"|"m"}; off?:{...}; zone: "Z1"|"Z2"|"Z3"|"Z4"|"Z5"|"TEST"; note?: string };
type Workout = { code: string; defaultDay: "TER"|"QUI"|"SEX"|"SAB"; type: WorkoutType; zones: Zone[]; steps: Step[]; note?: string };
type PhaseWeek = { week: 1|2|3|4; workouts: Workout[] };
// WORKOUTS_LEVEL_1[phase][weekIndex] = Workout[]
```
Todos os T01..T12 (N1) e T01..T16 (N2) das 4 fases conforme prompt, incluindo Teste 3km e Simulado 5km.

## 3. Distribuição automática de dias

`src/lib/planilha-5km-distribute.ts`:
- Input: array de workouts da semana (na ordem natural TER/QUI/SEX/SAB), array de `weekDays` selecionados.
- Prioridades:
  1. **MANTER** (na ordem): "Base aeróbia"+"Longão" longo > "Corrida Rápida"+"Subidas"+"Intervalado*" Z4/Z5 > "Tempo Run"+"Progressivo".
  2. **REMOVER** (na ordem): "Regenerativo" Z1 > duplicados do mesmo tipo.
- Treino mais longo (maior soma de minutos/metros) → último dia da semana.
- Nunca 2 intensos (Z4 ou Z5) consecutivos: se inevitável, retorna flag `hasConsecutiveIntense=true` para a UI exibir aviso de confirmação.
- `weekDays.length > workouts.length` → dias extras viram `OFF`.
- Retorna `{ assignments: Record<DayCode, Workout|"OFF">, warnings: string[] }`.

## 4. UI da tela

Rota: `src/routes/_authenticated/planilha-5km.tsx`. Acesso = `_authenticated` (coach + admin já cobertos).

Estrutura em cards verticais:

**Card 1 — Aluno**
- `Select` com lista de alunos (mesma query do Teste 3km).
- Se vazio: "Selecione o aluno para começar".

**Card 2 — Dados do aluno** (após selecionar)
- Mostra nome, FTP (`mm:ss/km`), base speed (km/h), tabela compacta das 5 zonas (pace De→Até e km/h De→Até) — reaproveita dados do `latestTest.metadata.zones`.
- Se sem teste 3km: alerta "Este aluno ainda não possui teste cadastrado." + link para `/teste-3km`.

**Card 3 — Configuração**
- Toggle/Tabs `Nível 1 (3x/sem)` | `Nível 2 (4x/sem)` (sugestão default por `students.level`: iniciante→N1; intermediario/avancado→N2).
- Input numérico `Dias por semana` (1–7, default 3 ou 4 conforme nível).
- Checkboxes SEG..DOM (defaults: N1=TER/QUI/SAB, N2=TER/QUI/SEX/SAB).
- Validação inline: contagem de checkboxes deve = número.
- Botão "Aplicar configuração" → chama `savePlanilha5kmConfig` e expande Card 4.

**Card 4 — Fase e treinos**
- Tabs `Fase 1 | Fase 2 | Fase 3 | Fase 4` com subtítulo.
- Para cada uma das 4 semanas: título "Semana X" + grid horizontal com 1 card por dia configurado.
- Card de treino: dia / código (T01) / chip de tipo colorido / chip de zonas. Card OFF cinza.
- Se a distribuição detecta intensos consecutivos: `AlertDialog` "Atenção: treinos intensos em dias seguidos podem aumentar risco de lesão. Deseja continuar?" antes de confirmar a aplicação.
- Drag/edição manual: opção simples — ao clicar no chip do dia em cima do card, abre dropdown para trocar com outro dia (escopo mínimo). Salva automaticamente alterações de fase no `training_plans`.

**Modal de detalhes** (`Dialog`)
- Trigger: clique no card de treino.
- Título: `T01 — Base aeróbia | TERÇA`.
- Seções Aquecimento / Treino Principal / Recuperação / Complemento — render dos `steps` agrupados.
- Para cada step: descrição original + linha personalizada calculada com a zona do aluno:
  - Tempo: `15min Z2 → 7:19 a 8:22 min/km | 7,17 a 8,21 km/h`
  - Metros: `3000m Z3 → 5:30 a 5:50 min/km`
  - Intervalado `3x(2min Z4 + 2min Z1)` → expande on/off com paces das duas zonas.
  - Z5 sem teto → "Máx".
- Helpers de formatação reaproveitam `formatMmss` de `teste-3km.ts`.

**Card 5 — rodapé**
- Botão "Salvar configuração" (já salva no Aplicar; aqui é manual extra) e indicador "Salvo automaticamente em hh:mm".

Ao reabrir a tela com aluno já configurado: carrega `plan.payload`, pré-seleciona nível/dias/fase e renderiza diretamente a Card 4.

## 5. Validações

- Sem aluno: botão Aplicar desabilitado.
- Sem teste 3km: bloqueia Card 3 com alerta + CTA p/ Teste 3km.
- Nível ausente em `students.level`: apenas usa default sugerido; não bloqueia (escolha é na tela).
- `daysPerWeek ≠ checkboxes`: erro inline; bloqueia Aplicar.
- Intensos consecutivos: confirm dialog antes de prosseguir.

## 6. Sidebar

Item "Planilha 5KM" já existe e aponta para `/planilha-5km` — nenhuma mudança.

## 7. Entregáveis

- `src/lib/planilha-5km-data.ts` (banco de treinos N1/N2, 4 fases)
- `src/lib/planilha-5km-distribute.ts` (algoritmo de distribuição)
- `src/lib/planilha-5km.functions.ts` (server fns get/save)
- `src/routes/_authenticated/planilha-5km.tsx` (substitui placeholder)
- Componente interno `WorkoutCard` + `WorkoutDetailDialog` (no mesmo arquivo da rota ou `src/components/planilha-5km/*`)

## Fora de escopo

- Editor livre de treinos (só drag de dia)
- PDF da planilha (pode vir depois, reaproveitando estrutura do PDF do Teste 3km)
- Histórico de planilhas anteriores
- Marcação de treino concluído pelo aluno
