# Personalizar planilha sem sair da tela

## Objetivo
Clicar em **Personalizar planilha** dentro de `/planilha-5km` (e nas demais 10/21/42 km) abre um **drawer lateral grande** sobre a própria planilha, contendo o editor completo de prescrição. Sem navegação, sem cabeçalho do aluno.

## O que muda

### 1. Extrair editor para componente reutilizável
Criar `src/components/prescricao/PrescricaoEditor.tsx` com todo o conteúdo funcional da rota atual `alunos.$studentId.prescricao.$planId.tsx` (grid de semanas, DnD, `WeekSummaryRow`, `DayCell`, `SessionDayCard`, `SessionLibrarySheet`, `SessionEditorSheet`, hidratação via `getPlanCustomization`, salvar via `savePlanCustomization`, undo, atalho Ctrl+Z).

Props: `{ studentId: string; planId: string; onClose?: () => void }`.

O cabeçalho "Voltar para o aluno" + nome do aluno fica **fora** do componente (ou condicional). Dentro do drawer mostramos só: título "Personalizar prescrição", botões Desfazer / Biblioteca / Salvar.

### 2. Novo wrapper drawer
Criar `src/components/prescricao/PrescricaoEditorSheet.tsx`:
- `<Sheet>` do shadcn com `side="right"` e classe `sm:max-w-[1200px] w-full` (quase tela cheia, deixa um respiro à esquerda para sentir que está sobreposto).
- Renderiza `<PrescricaoEditor />` dentro.
- Props: `{ open, onOpenChange, studentId, planId }`.

### 3. Trocar o botão nas 4 planilhas
Em `planilha-5km.tsx`, `planilha-10km.tsx`, `planilha-21km.tsx`, `planilha-42km.tsx`:
- Remover o `<Link to="/alunos/$studentId/prescricao/$planId">`.
- Adicionar `const [editorOpen, setEditorOpen] = useState(false)`.
- Botão vira `<Button onClick={() => setEditorOpen(true)}>`.
- Renderizar `<PrescricaoEditorSheet open={editorOpen} onOpenChange={setEditorOpen} studentId={studentId} planId={dataQuery.data.plan.id} />` no final.
- Ao fechar o drawer (após Salvar), invalidar a query da planilha para refletir mudanças.

### 4. Manter rota antiga funcional
A rota `/alunos/$studentId/prescricao/$planId` continua existindo (deep-link, fluxo antigo a partir do perfil do aluno). Ela passa a renderizar o mesmo `<PrescricaoEditor />` + o cabeçalho "Voltar para o aluno" + nome do aluno por fora. Sem duplicação de código.

## Detalhes técnicos
- O `useTrainingStore` é zustand global; já está preparado para `loadPrescription(planId, studentId, weeks)` e `markClean()`. Funciona igual dentro do drawer.
- O `SessionLibrarySheet` e `SessionEditorSheet` são Sheets aninhados sobre o drawer — o shadcn Sheet suporta empilhamento (cada um tem seu próprio overlay).
- Atalho Ctrl+Z fica ativo só enquanto o drawer está aberto (registrar listener no `useEffect` do `PrescricaoEditor`, condicionado a estar montado — já é o comportamento natural).
- Após `Salvar`, mostrar toast e manter o drawer aberto; o usuário fecha quando quiser. Ao fechar, refazer `dataQuery.refetch()` na planilha pai.

## Arquivos
- novo: `src/components/prescricao/PrescricaoEditor.tsx`
- novo: `src/components/prescricao/PrescricaoEditorSheet.tsx`
- editar: `src/routes/_authenticated/alunos.$studentId.prescricao.$planId.tsx` (passa a usar o componente)
- editar: `src/routes/_authenticated/planilha-5km.tsx`
- editar: `src/routes/_authenticated/planilha-10km.tsx`
- editar: `src/routes/_authenticated/planilha-21km.tsx`
- editar: `src/routes/_authenticated/planilha-42km.tsx`
