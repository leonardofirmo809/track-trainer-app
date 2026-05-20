## Diagnóstico

A UI da Planilha 10km já permite qualquer número de dias (`validateWeekDays10km` só exige ≥1), mas o `configSchema` em `src/lib/planilha-10km.functions.ts` ainda exige **exatamente 3 dias para N1** e **4 ou 5 dias para N2**. Quando o usuário troca de plano com uma contagem fora dessa regra (ex.: 3 dias em N2, ou 6+ dias), `changePhase` → `persistConfig` chama o server e dispara o erro `"Configuração inválida para o nível selecionado."`.

## Mudança

Arquivo único: **`src/lib/planilha-10km.functions.ts`**

- Trocar `weekDays: z.array(DAY).min(3).max(5)` por `weekDays: z.array(DAY).min(1).max(7)`.
- Remover o `.refine(...)` que amarrava contagem ao `level` (a UI já trata sugestão suave via `softDayCountMessage10km`).

Resultado: o schema do servidor passa a refletir o que a UI permite, eliminando o erro ao trocar de plano.

## Fora de escopo

UI, distribuição, PDF, banco, RLS, outras planilhas.
