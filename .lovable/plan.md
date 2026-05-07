## Diagnóstico

1. **O usuário não foi criado de fato.** Verifiquei o banco e `gustavohdeoli@gmail.com` não existe em nenhuma tabela (auth.users, profiles, user_roles, admin_audit_log). A operação falhou silenciosamente em algum ponto antes de criar a conta.
2. **A trigger `on_auth_user_created` está faltando.** A função `handle_new_user()` (que cria o profile e dá o role `coach`) existe, mas não há nenhuma trigger em `auth.users` chamando ela. Resultado: mesmo quando o cadastro funciona, o treinador não aparece na lista de "Treinadores ativos" porque não recebe o role `coach` nem profile.
3. **A criação manual não é defensiva.** Se a trigger falhar ou não existir, a função server `createCoachAccount` cria o usuário em auth mas não garante profile + role.

## Plano

### 1. Recriar a trigger faltando (migração)
Criar `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()` para que todo novo usuário ganhe profile + role automaticamente (cobre signup via convite e criação manual).

### 2. Tornar `createCoachAccount` resiliente (`src/lib/admin-coaches.functions.ts`)
Após `auth.admin.createUser`, fazer `upsert` explícito em `profiles` e `user_roles` (role `coach`). Assim, mesmo se a trigger falhar, o treinador aparece na lista.

### 3. Melhorar feedback de erro no diálogo "Criar conta manual" (`src/routes/_authenticated/admin.treinadores.tsx`)
Hoje o `catch` mostra `e.message`, mas quando o servidor lança `Response`, vem string genérica. Tratar `Response` lendo `await e.text()` para mostrar o erro real (ex.: "User already registered", senha fraca, etc.).

### 4. Backfill de usuários existentes (migração)
Garantir que qualquer usuário em `auth.users` sem profile/role vire coach (sem mexer em admins já existentes). Hoje só existe 1 usuário e ele já está OK, mas a query é idempotente.

### 5. Pedir para você refazer o cadastro
Depois das correções, abrir "Criar conta manual" novamente para `gustavohdeoli@gmail.com`. Se houver qualquer falha, o toast vai mostrar o motivo real.

## Observação
Como o usuário não existe no banco, não há nada para "recuperar" — vamos refazer o cadastro depois que as correções forem aplicadas.