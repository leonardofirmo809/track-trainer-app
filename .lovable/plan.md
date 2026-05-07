## Objetivo

Adicionar ao painel `/admin/treinadores` um segundo botão **"Criar conta manual"** (ao lado de "Convidar treinador") que permite ao admin cadastrar um treinador definindo nome, e-mail e senha na hora — sem passar pelo fluxo de convite por link.

## Fluxo

1. Admin clica em **Criar conta manual** → abre modal com: Nome, E-mail, Senha (mín. 8), Confirmar senha.
2. Ao confirmar, uma **server function** protegida (somente admin) cria o usuário usando o `supabaseAdmin` (service role) com `email_confirm: true`.
3. O trigger `handle_new_user` já existente cria o profile e atribui o role `coach` automaticamente.
4. Modal fecha, lista de treinadores é recarregada, toast de sucesso.

## Por que server function (e não direto pelo client)

Criar usuário com senha pré-definida exige `auth.admin.createUser`, que só funciona com a **service role key** — ela não pode ir para o navegador. Então:

- Criar `src/lib/admin-coaches.functions.ts` com `createCoachAccount({ email, password, fullName })`.
- Usar middleware `requireSupabaseAuth` + checagem extra `has_role(userId, 'admin')` no handler. Se não for admin, retorna 403.
- Validação com Zod (e-mail válido, senha 8-72 chars, nome 2-100).
- Usa `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.

## Mudanças no UI

Em `src/routes/_authenticated/admin.treinadores.tsx`:

- Adicionar segundo Dialog **"Criar conta manual"** com botão `variant="outline"` ao lado do "Convidar treinador".
- Reutilizar o mesmo padrão visual do modal de convite.
- Após sucesso, chamar o `load()` existente para atualizar a lista de treinadores ativos.

## Sem mudanças no banco

Toda a infraestrutura (roles, profiles, trigger) já existe. Só falta o caminho de criação direta.

## Fora de escopo

- Editar/desativar treinadores existentes (pode vir depois).
- Cadastro público em `/signup` (continua desativado, conforme decisão anterior).
