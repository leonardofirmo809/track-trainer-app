## Diagnóstico

O servidor function `createCoachAccount` (e qualquer outra protegida por `requireSupabaseAuth`) **nunca executa com sucesso** porque o navegador não envia o header `Authorization: Bearer <token>` do Supabase para o endpoint interno `/_serverFn/...` do TanStack Start.

Evidências coletadas no banco:
- `auth.users`: só existe o admin `leonardofirmo809@gmail.com`. O usuário `gustavohdeoli@gmail.com` **nunca foi criado**.
- `admin_audit_log`: 0 linhas (a função insere um log no fim, então nem chegou até lá).
- `tests`: 0 linhas (mesmo problema afetaria `saveTeste3km`).
- Quando chamei a Admin API diretamente (curl com service role), tudo funcionou: o trigger `on_auth_user_created` criou perfil + role `coach` corretamente. Logo, **o backend está OK**; o problema é só o transporte do token.

O middleware `requireSupabaseAuth` lê `request.headers.get('authorization')` e devolve 401 se ausente. Não existe nenhum interceptor de fetch no projeto que adicione esse header — por isso toda chamada de server function autenticada está silenciosamente falhando.

## Correção

Instalar um interceptor global de `fetch` no bundle do cliente que, para chamadas a server functions do TanStack (`/_serverFn/`), injeta automaticamente o `Authorization: Bearer` com o `access_token` da sessão atual do Supabase.

### Passos

1. **Criar `src/integrations/supabase/fetch-interceptor.ts`**
   - Função `installServerFnAuthInterceptor()` que envolve `globalThis.fetch`.
   - Para URLs que contenham `/_serverFn/` (ou começo relativo `/_serverFn`), chama `supabase.auth.getSession()` e adiciona `Authorization: Bearer <access_token>` se ainda não houver.
   - Idempotente (não reinstala se já tiver sido instalado).
   - Roda só no browser (`if (typeof window === 'undefined') return`).

2. **Ativar o interceptor em `src/lib/auth-context.tsx`**
   - Chamar `installServerFnAuthInterceptor()` no topo do `AuthProvider` (uma vez), antes de fazer `getSession`.

3. **Validar**
   - Reabrir "Criar conta manual" com um e-mail de teste e confirmar que aparece em `Treinadores ativos` e que entra em `admin_audit_log`.
   - Confirmar que o login com a senha definida funciona.

### Observação sobre o problema secundário relatado

O usuário disse que "ele não consegue logar" — isso é consequência direta: como o usuário nunca foi criado no `auth.users`, qualquer tentativa de login com `gustavohdeoli@gmail.com` retorna "Invalid credentials". Após o fix acima, novas contas funcionarão imediatamente (o `email_confirm: true` já está no `createUser`, então não exige confirmação por e-mail).

Não há mudanças de banco de dados, RLS, triggers ou de UI necessárias.