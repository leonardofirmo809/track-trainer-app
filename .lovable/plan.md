# Plano — Reformular tela de listagem de alunos

## Mapeamentos importantes

- **Programa** (modal) = `target_distance` no schema. Valores: `10km` / `21km` / `42km` (sem 5km, conforme spec).
- **Nível** (modal) = `level` enum existente. Mapeamento:
  - "Nível 1" → `iniciante`
  - "Nível 2" → `intermediario`
  - Coluna na lista mostra "Nível 1" / "Nível 2" / "—" (escondendo `avancado` se aparecer dados antigos exibe "Avançado").
- **Última atividade**: maior `created_at` em `tests` para o aluno; fallback `students.created_at` rotulado "Cadastro".

## 1. Header da tela (`src/routes/_authenticated/alunos.index.tsx`)

- Título `Meus Alunos` + contador `({n})` ao lado.
- Barra de busca por nome com filtro client-side em tempo real (mantém `useState` + filtro local — já existe).
- Remover filtros de nível/distância existentes (escopo: simplificar conforme spec — apenas busca).
- Botão "Novo aluno":
  - Desktop: `Button` primário com ícone + texto, abre modal.
  - Mobile: FAB `fixed bottom-20 right-4` (acima do bottom nav), ícone `Plus`, `aria-label`.

## 2. Lista desktop (`md:` e acima)

- Tabela com colunas: Avatar+Nome (email abaixo), Programa (badge), Nível ("Nível 1/2"), Última atividade (data relativa), Ações.
- Linha clicável (`onClick` para navegar ao perfil) com `cursor-pointer hover:bg-muted/50`.
- Coluna ações: `Pencil` (abre modal de edição — fora de escopo agora, deixar disabled OU navegar para `/alunos/$studentId`) e `Trash2` em vermelho (`text-destructive`) com confirmação `AlertDialog`. **Decisão:** botão editar navega para o perfil (não há tela de editar inline). Lixeira chama `supabase.from('students').delete()` após confirmação.
- Empty state: ícone `Users`, "Nenhum aluno cadastrado ainda", botão "Cadastrar primeiro aluno" que abre o modal.

## 3. Lista mobile (`< md`)

- Cards empilhados (`md:hidden space-y-3`).
- Cada card:
  - `Avatar` 40px com iniciais; cor de fundo determinística por hash da inicial usando paleta de tokens do design system (variantes do `--primary`, `--accent`, `--success`, `--warning`, `--chart-*`).
  - Nome em destaque (`font-medium`), linha menor com programa + nível.
  - `ChevronRight` à direita.
  - Card inteiro é `<Link>`.
- **Swipe-to-remove**: implementar com touch events nativos no `<li>` (touchstart/move/end). Translate negativo até -88px revela botão "Remover" (vermelho, full-height, à direita absoluto). Abre AlertDialog ao tocar. Sem libs externas.
- **Pull-to-refresh**: detectar `touchstart` no topo do scroll (window scrollY === 0), `touchmove` calcula delta vertical, mostra indicador (ícone `RefreshCw` rotacionando) acima da lista; ao soltar com delta > 70px chama `refetch()` do React Query. Implementação custom (~50 linhas), sem libs.

## 4. Modal Novo Aluno (`src/components/student-create-modal.tsx` — novo)

- Componente único responsivo:
  - **Desktop (`md:`+):** `Dialog` shadcn central.
  - **Mobile:** `Sheet` com `side="bottom"` (bottom sheet que sobe).
- Campos:
  - Nome completo (obrigatório, trim, 2–120 chars)
  - E-mail (opcional, validação `z.string().email()`)
  - Telefone (opcional, máx 32 chars)
  - Programa — `Select`: `10km` / `21km` / `42km` (obrigatório)
  - Nível — `Select`: "Nível 1" / "Nível 2" → grava `iniciante`/`intermediario`
  - Observações — `Textarea` (opcional, máx 1000)
- Validação inline com Zod + erro abaixo do campo (mensagem em vermelho).
- Botão "Salvar" desabilitado até `nome.trim().length>=2 && programa`.
- Submit: `supabase.from('students').insert({...})` com `coach_id`, `toast.success`, fecha modal, `queryClient.invalidateQueries(['students'])`.

## 5. Query e dados

- Query `['students']`: já carrega students. Adicionar query `['student-last-activity']` que faz `supabase.from('tests').select('student_id, created_at').order('created_at', { ascending: false })` e reduz para `Map<student_id, date>` no client.
- `count` no header = `data?.length ?? 0`.

## 6. Fora de escopo

- Não tocar em `src/routes/_authenticated/alunos.novo.tsx` (manter para link direto / SEO; pode redirecionar futuramente).
- Sem mudanças no schema do banco, RLS ou na rota de perfil do aluno.
- Sem nova tabela "programas/níveis".

## Arquivos afetados

- editar: `src/routes/_authenticated/alunos.index.tsx` (rewrite completo)
- criar: `src/components/student-create-modal.tsx`
- criar: `src/components/student-mobile-card.tsx` (card com swipe)
- criar: `src/hooks/use-pull-to-refresh.ts`
