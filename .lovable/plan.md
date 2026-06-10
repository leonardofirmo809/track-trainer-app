## Dashboard do corredor — visualização orientada ao consumo

Mantém a estética atual (mesmos tokens, cards, tipografia do coach) e **reorganiza a hierarquia** do `/corredor` para responder à pergunta principal do corredor: "o que eu treino hoje?". A área do coach continua intocada.

### Mudanças (apenas em `src/routes/_authenticated/corredor.index.tsx` + um helper novo)

Nova ordem visual da página:

1. **Header compacto** (1 linha): nome + badge objetivo/nível + contagem regressiva inline (X semanas · Y dias). Remove o bloco grande gradiente atual; vira faixa enxuta.
2. **HERO — Treino de hoje** (novo, principal foco)
   - Card grande no topo com:
     - Etiqueta do dia (ex.: "Quarta · 11/06")
     - Nome do treino (ex.: "Intervalado 5×1000m Z4")
     - Linha de paces/zonas-alvo extraídas das zonas do último teste
     - Estrutura resumida (aquecimento → série → volta à calma) com duração total estimada
     - CTA primário "Ver detalhes na planilha" → `/planilha-{goal}` na semana/dia corretos
     - Botão secundário "Marcar como concluído" (apenas visual nesta iteração — fora de escopo persistir)
   - Estados:
     - **Rest day**: card "Descanso hoje" + sugestão "alongar / mobilidade"
     - **Sem plano**: CTA "Gerar minha planilha" → `/corredor/onboarding`
3. **Esta semana** (mini-card horizontal)
   - 7 chips (SEG–DOM) mostrando código do treino ou "—" em rest. Dia atual destacado. Clique em qualquer chip → abre planilha no dia.
4. **Próximo treino** (1 linha pequena): "Próximo: Sexta · Longão Z2 12km".
5. **Cards secundários** (grid 2-col em desktop, stack mobile, recolhidos visualmente):
   - Plano atual (Plano X de 4 · semana Y de 4) com link "Ver os 4 planos" → abre acordeão inline com os 4 mini-cards (hoje fica sempre visível ocupando muito espaço).
   - Suas zonas (mesmo card de zonas atual, mais compacto — 5 chips em vez de cards).
6. **Rodapé**: ações "Refazer avaliação" e "Nova planilha" como links discretos (não mais botões grandes — já estão na sidebar).

Remove da página: bloco "Como funciona" (move para tooltip ou só onboarding) e o bloco grande "Quick actions" duplicado (CTAs migram pro hero).

### Helper novo: `src/lib/runner-today.ts`

Função pura que recebe `activePlan.payload`, `activePlan.start_date`, `weekDays`, `currentPhase` e devolve:

```ts
{
  todayDate: Date,
  todayDayKey: DayOfWeek,   // SEG..DOM
  weekNumber: number,       // 1..4 dentro da fase
  todaySession: TrainingSession | null,    // null = rest day
  nextSession: { dayKey, date, session } | null,
  weekChips: Array<{ dayKey, date, session: TrainingSession | null, isToday: boolean }>,
}
```

Usa `planPayloadToWeeks()` (já existe) para extrair as 4 semanas da fase atual e calcula o dia atual a partir de `start_date` (se ausente, usa created_at).

### Fora de escopo

- Não toca em rotas/arquivos do coach (`planilha-*km.tsx`, `dashboard.tsx`, `alunos*`).
- Não muda paleta nem tipografia (mesma estética).
- Não muda sidebar/bottom-nav (já variantes runner).
- Sem migrations, sem novo backend (reusa `getRunnerOverview`).
- Sem persistir "concluído" agora — apenas UI.

### Ordem de execução

1. Criar `src/lib/runner-today.ts` com a função pura + tipos.
2. Reescrever `corredor.index.tsx` com a nova hierarquia (header enxuto → hero hoje → semana → próximo → secundários).
3. Verificar visualmente nos 3 estados: sem plano, rest day, dia com treino.
