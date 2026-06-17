## Problema

Quando um treinador recém-aprovado completa o onboarding e clica em "Ir para o dashboard", a tela fica eternamente em "Carregando…". O usuário também pode ver esse loop logo após entrar.

## Causa

Há um loop de redirecionamento entre `/onboarding` e `/dashboard`:

1. O guarda em `src/routes/_authenticated.tsx` usa uma React Query (`["auth-guard", user.id]`) com `staleTime: 5 minutos` para decidir se o usuário precisa fazer onboarding.
2. Quando o treinador termina o onboarding em `src/routes/onboarding.tsx`, a função `finish()` faz `UPDATE` no perfil (`onboarding_completed=true`) e chama `router.invalidate()` + `navigate("/dashboard")`.
3. `router.invalidate()` re-roda loaders do router, mas **não invalida o cache do React Query**. O guarda continua lendo o valor antigo (`needsOnboarding: true`) e redireciona de volta para `/onboarding`.
4. `/onboarding` busca o perfil, vê `onboarding_completed=true`, navega novamente para `/dashboard`. O ciclo se repete e o usuário vê "Carregando…" para sempre.

Existe ainda um risco menor: se o cache estiver velho na entrada (treinador acabou de ser aprovado em outra aba), o mesmo loop pode acontecer ao chegar no `/dashboard`.

## Correção

### 1. Invalidar o cache do guarda quando o onboarding terminar
Em `src/routes/onboarding.tsx`, dentro de `finish()`:
- Importar `useQueryClient` de `@tanstack/react-query`.
- Após o `update`, chamar `await queryClient.invalidateQueries({ queryKey: ["auth-guard"] })` antes do `navigate({ to: "/dashboard" })`.
- Remover o `router.invalidate()` (não é necessário aqui).

### 2. Evitar o redirecionamento prematuro em `/onboarding`
Em `src/routes/onboarding.tsx`, no `useEffect` de carregamento inicial:
- Em vez de chamar `navigate({ to: "/dashboard" })` quando `onboarding_completed=true`, apenas marcar `setChecked(true)` e deixar o guarda decidir (após invalidar o cache acima).
- Adicionar uma chamada explícita `queryClient.invalidateQueries({ queryKey: ["auth-guard"] })` ao montar a página, garantindo que o guarda releia o estado real do perfil ao chegar aqui.

### 3. Reduzir o `staleTime` do guarda
Em `src/routes/_authenticated.tsx`, baixar `staleTime` de `5 * 60_000` para `0` (ou `30_000`). Essa query é pequena e barata; ter cache de 5 minutos cria problemas de sincronização sempre que o perfil ou roles mudam.

## Verificação

- Aprovar um novo treinador, logar como ele, completar os 3 passos do onboarding e confirmar que a navegação para `/dashboard` acontece sem loop.
- Verificar o Network: após `finish()`, devem aparecer um `UPDATE profiles` e em seguida uma releitura de `profiles` + `user_roles` (guarda), depois a navegação para `/dashboard` permanece.
