# Personalização rápida da planilha gerada

Hoje, para customizar uma planilha já gerada, o treinador precisa: sair de `/planilha-5km` → ir em **Alunos** → abrir o aluno → clicar **Personalizar** na linha da planilha. Muitos cliques e troca de contexto.

## Objetivo

Logo após gerar/salvar uma planilha (5/10/21/42 km), permitir personalizar em 1–2 cliques sem sair da tela, e tornar a ação mais usada — **trocar uma sessão pela biblioteca** — imediata.

## O que será entregue

### 1. Atalho "Personalizar planilha" no topo de cada planilha

Nas telas `planilha-5km.tsx`, `planilha-10km.tsx`, `planilha-21km.tsx`, `planilha-42km.tsx`, adicionar botão no header (junto a Salvar/Exportar PDF):

- Habilitado quando há `studentId` selecionado e a planilha já foi salva (existe `planId`).
- Navega direto para `/alunos/$studentId/prescricao/$planId`.
- Desabilitado com tooltip "Salve a planilha primeiro" enquanto não houver `planId`.

### 2. Edição inline na grade da prescrição

Na rota `/alunos/$studentId/prescricao/$planId`, tornar cada **card de sessão** mais direto:

- **Clique simples no card** → abre `QuickSwapPopover` (item 3) ancorado no card.
- **Ícone de lápis** (já existe) → continua abrindo o Sheet completo de edição.
- **Hover** revela 2 ações compactas: **Trocar** (popover) e **Remover** (zera o slot — usa `removeSession` já existente no store).

Elimina a necessidade de abrir o Sheet só para trocar uma sessão.

### 3. `QuickSwapPopover` — troca rápida pela biblioteca (ação principal)

Novo componente `src/components/prescricao/QuickSwapPopover.tsx` usando `Popover` + `Command` (cmdk) do shadcn:

- Input de busca no topo (filtra `sessionLibrary` + `customSessions` por código, nome e tags).
- Chips de filtro: **Todas / LOW / MOD / HIGH** (mesma classificação já usada).
- Lista rolável (até ~10 itens visíveis) com: código, nome, badge de intensidade, duração/distância de referência.
- Selecionar preset → chama `updateSession(weekIndex, day, { ...preset, id: newSessionId(), isCustom: true })`, fecha o popover, toast discreto: "Sessão trocada • Desfazer".
- Atalhos nativos do `cmdk`: `↑`/`↓` navegam, `Enter` confirma, `Esc` fecha.

Reusa a fonte de verdade já existente (`sessionLibrary` + `customSessions` do `training-store`); não duplica lista.

### 4. Salvamento manual preservado

Mantém o botão **Salvar alterações** atual (sem auto-save). Cada troca pelo popover já entra no histórico de **Desfazer** porque usa `updateSession` do store.

### Fora de escopo

- Drag-and-drop entre dias (já existe via `@dnd-kit`, sem mudança).
- Edição inline de HH:MM:SS / km no próprio card.
- Duplicar semana, marcar dia como descanso em 1 clique.
- Auto-save.
- Versionamento histórico no banco.
- Regenerar PDF a partir do plano customizado.

## Detalhes técnicos

**Arquivos a editar:**

- `src/routes/_authenticated/planilha-5km.tsx`, `planilha-10km.tsx`, `planilha-21km.tsx`, `planilha-42km.tsx` — adicionar botão **Personalizar planilha** no header. Usa o `planId` retornado por `savePlanilha*Config` / exposto em `dataQuery.data` (verificar campo `savedPlan.id` ou similar; se não estiver exposto, expor no retorno da server fn).
- `src/routes/_authenticated/alunos.$studentId.prescricao.$planId.tsx` — substituir clique simples do card pelo `QuickSwapPopover`; adicionar botões hover **Trocar** / **Remover**; manter ícone de lápis para o Sheet completo. Também aplicar o fix dos hooks já listado em `.lovable/plan.md` (mover `useSensors` para antes do early-return e estabilizar deps do `useEffect` de hidratação).

**Arquivos novos:**

- `src/components/prescricao/QuickSwapPopover.tsx` — props: `open`, `onOpenChange`, `anchor` (ou children como trigger), `currentSessionId`, `onPick(preset)`. Usa `Popover` + `Command`/`CommandInput`/`CommandList`/`CommandItem` já disponíveis.

**Store (`src/lib/training-store.ts`):**

- Sem mudanças estruturais. `updateSession` + `removeSession` + `undo` já cobrem o fluxo. Apenas garantir que os presets selecionados sejam clonados com `newSessionId()` e `isCustom: true` antes de chamar `updateSession` (lógica fica no popover, não no store).

**Persistência:**

- Sem mudanças. **Salvar alterações** continua chamando `savePlanCustomization` (Zod + RLS) gravando em `training_plans.payload.customization`.

**Acessibilidade:**

- `Popover` com foco inicial no input de busca (cmdk já faz isso).
- `aria-label` no card descrevendo a sessão atual ("Trocar sessão de TER, semana 2: Longão Z2").

## Validação

1. Em `/planilha-5km`, gerar e salvar planilha → botão **Personalizar planilha** habilita e leva direto à prescrição.
2. Na prescrição, clicar num card → popover abre com biblioteca filtrada; escolher preset → card atualiza, toast aparece, `Ctrl+Z` reverte.
3. Hover no card → botão **Remover** zera o dia; **Salvar** persiste; reload re-hidrata do banco.
4. Clicar no lápis → Sheet completo abre como hoje (regressão zero).
5. Repetir nas planilhas 10/21/42 km.
