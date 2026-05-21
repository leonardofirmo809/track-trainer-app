## Diagnóstico

Analisei as áreas indicadas (listagem de alunos + navegação geral) e encontrei 5 causas concretas de lentidão. Nada disso é problema de infraestrutura — é código que pode ser otimizado.

### 1. Tela "Carregando…" em cheio a cada navegação
`src/routes/_authenticated.tsx` faz duas consultas (`profiles` + `user_roles`) toda vez que o `user` muda e bloqueia **toda a tela** com "Carregando…" enquanto isso. Sem cache, então em qualquer reload completo o app fica ~300–800 ms preto antes de renderizar.

### 2. Listagem de alunos puxa TODOS os testes só para mostrar "última atividade"
Em `alunos.index.tsx`:
- `select("*")` em `students` (traz colunas grandes como `notes`, `injury_history`).
- `lastQ` faz `select("student_id, created_at") from tests` **sem filtro e sem limite** — conforme você cria mais avaliações, isso vira o gargalo principal da página.

### 3. Sem `staleTime` global → tudo refaz no foco/navegação
O `QueryClient` é criado vazio em `src/router.tsx`. Cada vez que você troca de aba ou volta para a página, todas as queries refazem do zero. Isso explica o "piorou nos últimos dias": à medida que dados crescem, o custo do refetch automático cresce junto.

### 4. Queries duplicadas com chaves diferentes
- `["students-list"]` em `teste-3km.tsx` vs `["students"]` em `alunos.index.tsx` → dois fetches do mesmo dado.
- `useRoles` (hook próprio com `useState`) vs query inline de role em `_authenticated.tsx` → dois fetches de `user_roles` do mesmo usuário.

### 5. Font Google bloqueante
`Plus Jakarta Sans` é carregado por `<link rel="stylesheet">` síncrono no root, atrasando o primeiro paint em conexões piores.

---

## O que vou fazer

### Passo 1 — `QueryClient` com defaults sensatos (impacto alto, mudança pequena)
Em `src/router.tsx`, criar o cliente com:
- `staleTime: 60_000` (1 min) — dados ficam "frescos" por 1 minuto, sem refetch ao re-navegar.
- `gcTime: 5 * 60_000`
- `refetchOnWindowFocus: false`
- `retry: 1`

Resultado: voltar para uma página visitada nos últimos 60 s é instantâneo.

### Passo 2 — Reescrever guard do `_authenticated.tsx`
- Trocar `useState/useEffect` por `useQuery` com `queryKey: ["auth-guard", user.id]` e `staleTime: 5 min`.
- Ao invés de bloquear a tela inteira com "Carregando…", renderizar o layout imediatamente e só redirecionar para `/onboarding` quando a query resolver (`needsOnboarding === true`). Enquanto carrega, exibir o app normalmente (a verificação roda em background; redirect só dispara se realmente precisar).
- Consolidar com `useRoles` para evitar a 2ª chamada a `user_roles`.

### Passo 3 — Listagem de alunos enxuta
Em `src/routes/_authenticated/alunos.index.tsx`:
- Trocar `select("*")` por `select("id, full_name, email, target_distance, level, created_at")`.
- Substituir a query `lastQ` (que puxa todos os testes) por uma RPC nova `get_students_last_activity()` que retorna `{ student_id, last_test_at }` agregado no Postgres (1 linha por aluno, não 1 por teste). Vou criar a migração com a função `STABLE SECURITY DEFINER` filtrando por `coach_id = auth.uid()` para respeitar RLS.
- Adicionar `staleTime: 30_000` específico nessa query.

### Passo 4 — Desduplicar `students-list`
Padronizar `queryKey: ["students"]` com mesma função de fetch em `teste-3km.tsx` (e em qualquer outro lugar com lista de alunos) para reusar cache.

### Passo 5 — Font Google não-bloqueante
Em `__root.tsx`, trocar o `<link rel="stylesheet">` do Google Fonts por padrão `preload`+`onload` (ou `media="print" onload="this.media='all'"`) para não bloquear o primeiro paint. O `display=swap` já está presente.

---

## Fora de escopo (não vou mexer agora)
- Geração de planilhas, PDFs, prescrição, telas admin.
- Schema de tabelas existentes (só adiciono a função `get_students_last_activity`).
- Mudança de instância Lovable Cloud — sua carga atual é claramente resolvível por código primeiro.

## Resultado esperado
- Navegação entre páginas já visitadas: instantânea (cache).
- Primeiro load de `/alunos`: 1 query leve em vez de 2 queries pesadas.
- Sem flash de "Carregando…" branco entre páginas autenticadas.
- Listagem de alunos não degrada conforme volume de testes cresce.
