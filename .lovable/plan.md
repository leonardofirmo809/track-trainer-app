## Fechar o signup público — apenas convidados criam conta

Antes de mais nada: a página `/signup` **já é fechada hoje** (mostra "Cadastro por convite" com link para `/login`, sem formulário). E o fluxo `/aceitar-convite?token=...` também já existe. O que falta é fechar o portão no **Auth** e ajustar o aceite de convite para continuar funcionando depois disso.

### O problema com a abordagem ingênua
Se simplesmente desabilitarmos signups no Auth (`disable_signup = true`), a página `/aceitar-convite` para de funcionar — ela usa `supabase.auth.signUp`, que passa a ser bloqueado. Precisamos trocar esse caminho por uma criação de usuário **server-side**, que ignora a flag.

### Mudanças

**1. Desabilitar signup público** (Lovable Cloud → Auth)
- `disable_signup: true`. Login segue normal. Já existe um fluxo admin (`admin-coaches.functions.ts`) que usa `supabaseAdmin.auth.admin.createUser` — esse continua funcionando porque é service-role.

**2. Mover a criação de conta do convite para o servidor**
Novo `acceptInvite` em `src/lib/invites.functions.ts`:
- Input: `{ token, password, fullName? }` (Zod, password ≥ 8).
- Lê `coach_invites` por token (via `supabaseAdmin`); valida `status = 'pending'`, não expirado.
- `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
- Retorna `{ ok: true, email }` para o client. O trigger existente `handle_new_user` cuida de criar o `profile`, atribuir role `coach` e marcar o convite como `accepted`.

`src/routes/aceitar-convite.tsx`:
- Submit chama `acceptInvite` (server fn, não autenticada — é pública).
- Em sucesso, faz `supabase.auth.signInWithPassword({ email, password })` e navega para `/dashboard`.
- Mantém a tela de erro/expirado igual.

**3. Endurecer o trigger `handle_new_user`** (defesa em profundidade)
Hoje, qualquer signup vira `coach`, mesmo sem convite. Atualizar para:
- Procurar convite pendente pelo email; se não houver, `RAISE EXCEPTION 'Cadastro permitido apenas por convite.'` — o usuário nem chega a ser criado.
- Se houver, segue o comportamento atual (cria profile, atribui role `coach`, marca convite como `accepted`).

Isso garante que mesmo se alguém reabrir signup por engano, ou obtiver o service role, contas só nascem com convite válido.

**4. Pequeno ajuste em `/signup`**
- Se a URL trouxer `?token=xxx`, redirecionar imediatamente para `/aceitar-convite?token=xxx` (conveniência — caso o link do email aponte por engano para `/signup`).
- Sem token: mantém a tela atual ("Cadastro por convite", botão para `/login`). O texto já cobre o pedido do enunciado.

**5. Não mexer**
- `/login`: intocado.
- Fluxo admin de criar coach (`admin-coaches.functions.ts`): já usa service role; segue funcionando.
- Templates de email do convite e link `/aceitar-convite`: já estão certos.

### Arquivos
- **Novo**: `src/lib/invites.functions.ts` (server fn `acceptInvite`).
- **Edita**: `src/routes/aceitar-convite.tsx` (chama server fn + signIn), `src/routes/signup.tsx` (redirect se houver token).
- **Migration**: substitui `public.handle_new_user` para exigir convite pendente.
- **Configuração**: desabilita signup público no Auth.

### Fora de escopo
- "Esqueci minha senha" / página `/reset-password` (você mencionou que não tem hoje — posso fazer em separado se quiser).
- Login social (Google, etc.).
- HIBP / verificação de senha vazada.
