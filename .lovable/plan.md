## Problema

Ao trocar de aba do navegador e voltar, o Supabase dispara `onAuthStateChange` (evento `TOKEN_REFRESHED` / `SIGNED_IN`) com uma nova referência de `session`. Isso causa a seguinte cascata:

1. `AuthProvider` faz `setSession(novaSessão)` → `user` vira um novo objeto.
2. `useRoles` tem `user` no array de dependências do `useEffect` → re-executa e chama `setLoading(true)`.
3. `AdminLayout` (`src/routes/_authenticated/admin.tsx`) faz `if (loading) return "Carregando…"` → **desmonta o `<Outlet/>`**.
4. `AdminCoachesPage` desmonta junto, perdendo todo o estado local — incluindo `openManual` (o Dialog "Criar conta manual"), campos preenchidos, etc.

Quando o fetch termina, o componente remonta zerado → diálogo fechado.

## Correção

### 1. `src/lib/use-role.ts`
- Depender de `user?.id` em vez do objeto `user` inteiro, para não re-disparar a cada token refresh.
- Não voltar para `loading = true` quando já temos roles para o mesmo usuário (evita o flicker que desmonta o Outlet). Manter loading apenas no primeiro fetch.

### 2. `src/lib/auth-context.tsx`
- Ignorar eventos do `onAuthStateChange` quando o `user.id` da sessão não mudou (evita atualizações de referência desnecessárias por `TOKEN_REFRESHED`). Atualizar `session` somente se `s?.user?.id !== session?.user?.id`, ou guardar o token e atualizar sem trocar a referência do `user` para os consumidores que dependem só do id.

### 3. `src/routes/_authenticated/admin.tsx` (defesa em profundidade)
- Mostrar "Carregando…" apenas no primeiro carregamento (quando `roles` ainda está vazio e `loading` é true). Se já sabemos que é admin, não desmontar o `<Outlet/>` durante um refetch silencioso.

## Resultado esperado

Trocar de aba e voltar mantém o diálogo "Criar conta manual" (e qualquer outro estado local de página) intacto, pois o `Outlet` não é mais desmontado em refreshes de token.

## Escopo

Apenas frontend; nenhuma mudança em banco, RLS ou edge functions.