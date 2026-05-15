## Situação atual

A rota `/alunos/$studentId/prescricao/$planId` já está totalmente implementada em iterações anteriores:

- **Rota**: `src/routes/_authenticated/alunos.$studentId.prescricao.$planId.tsx` (533 linhas) — header, grade semanal 7 colunas, DnD com `@dnd-kit`, Sheet de Biblioteca com filtros LOW/MOD/HIGH + tipos + busca, Sheet do Editor com todos os campos (código, nome, intensidade, tipo, HH:MM:SS, distância, blocos, zonas Z1-Z5, auto-calcular, %L/%M+H, tags, descrição, "salvar também na biblioteca").
- **Store**: `src/lib/training-store.ts` com Zustand + persist, undo (10 níveis), recalcSummary em todos os mutators, clone de presets em `isCustom:true`.
- **Tipos / lib / adapter**: `training-session-types.ts`, `session-library.ts`, `plan-to-weeks.ts` prontos.
- **Persistência servidor**: `plan-customization.functions.ts` com `getPlanCustomization` / `savePlanCustomization` validados por Zod, RLS via coach owner + bypass admin.
- **Tokens de intensidade** em `src/styles.css` (light + dark).
- **Botão "Personalizar"** já adicionado na tabela de planilhas em `alunos.$studentId.tsx`.

## O que falta corrigir

### 1. Bug crítico: violação das regras dos hooks no `PrescricaoPage`

Hoje na rota:

```text
linha 85: if (isLoading || !data) return <p>Carregando…</p>;
linha 87: const sensors = useSensors(useSensor(PointerSensor, ...));
```

`useSensors` é chamado **depois** de um early-return condicional, o que quebra a ordem dos hooks no primeiro render (quando `isLoading` é true) e dispara erro do React assim que o dado chega. Mover `useSensors` para antes do early-return.

### 2. Pequenos ajustes de robustez

- `useEffect` de hidratação tem `store` no array de dependências; trocar por callback estável (`useTrainingStore.getState().loadPrescription`) para evitar reexecuções desnecessárias.
- `useTrainingStore()` no topo causa re-render do componente inteiro a cada mutação; manter mas confirmar que não trava a UX.

### 3. Verificação ponta a ponta

- Abrir `/alunos/<id>` → clicar **Personalizar** numa planilha 5/10/21/42 km existente.
- Conferir que carrega 4+ semanas, cards aparecem com badges de intensidade, drag-and-drop entre dias funciona (swap quando ocupado, move quando vazio), botão **Desfazer** desativa quando histórico vazio, **Salvar** persiste no `training_plans.payload.customization`.
- Reload da página → o estado salvo é re-hidratado a partir do banco.
- Abrir **Biblioteca** → filtrar HIGH → "Usar" injeta cópia com novo id.
- Editar um preset num dia → salvar → confere que virou `isCustom:true` no card e (opcionalmente) entrou na biblioteca.

## Arquivos a tocar

- `src/routes/_authenticated/alunos.$studentId.prescricao.$planId.tsx` — mover `useSensors` para antes do early-return; estabilizar deps do `useEffect` de hidratação.

Sem novos arquivos, sem migrations, sem dependências.

## Fora de escopo

- Versionamento de histórico no banco.
- Regenerar PDF a partir do plano customizado.
- Ordenação `@dnd-kit/sortable` dos blocos do editor (a UI atual usa add/remove sem reorder).
