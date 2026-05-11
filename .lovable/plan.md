## Objetivo

Impedir que o usuário configure um número de dias incompatível com o nível, evitando o caso "4 dias no Nível 1 → 1 dia OFF". O número de dias por semana e os dias da semana ficam travados de acordo com o nível selecionado.

Regras:
- Nível 1 → 3 dias por semana, fixos em **TER, QUI, SAB**.
- Nível 2 → 4 dias por semana, fixos em **TER, QUI, SEX, SAB**.

## Mudanças

Aplicar nos dois arquivos de tela (mesma lógica em ambos):
- `src/routes/_authenticated/planilha-5km.tsx`
- `src/routes/_authenticated/planilha-10km.tsx`

### 1. Card "3. Configuração da semana"
- Remover o `Input` numérico de "Dias de treino por semana". Substituir por um texto fixo: "Dias de treino por semana: **3** (Nível 1)" / "**4** (Nível 2)".
- Manter os checkboxes de dias da semana visíveis, mas **desabilitados** (`disabled`), apenas para mostrar quais dias estão prescritos. Os valores seguem `defaultDaysFor(level)`.
- Remover a função `toggleDay` (ou deixá-la inerte). Os checkboxes não respondem a clique.

### 2. Sincronização ao trocar de nível
- Ao trocar `level` na aba (Nível 1 / Nível 2), sempre forçar:
  - `daysPerWeek = level === 1 ? 3 : 4`
  - `weekDays = defaultDaysFor(level)` (já é o comportamento atual; manter).
- No `useEffect` que carrega a config salva, se vier do banco com `daysPerWeek`/`weekDays` divergentes do nível, sobrescrever para os valores travados antes de marcar `applied = true`. Isso corrige planos antigos salvos com 4 dias no Nível 1.

### 3. Validação
- A validação `weekDays.length !== daysPerWeek` deixa de ser necessária na prática (sempre baterá), mas mantemos como salvaguarda silenciosa.
- Remover a mensagem "Marque exatamente N dia(s)…" da tela, já que o usuário não tem mais como errar.

### 4. Server function (sem mudança de schema)
- `savePlanilha5kmConfig` / equivalente 10km continuam aceitando `daysPerWeek` e `weekDays`. A tela sempre envia os valores travados — não precisa alterar o validador no servidor.

## Fora de escopo

- Estrutura dos dados de treino (`WORKOUTS`, zonas, volumes).
- Layout do PDF e dos gráficos da fase.
- Telas `planilha-21km` / `planilha-42km`.
