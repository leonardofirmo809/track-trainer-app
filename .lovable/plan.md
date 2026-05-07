## Objetivo

Permitir que apenas treinadores convidados pelo administrador criem suas contas no PaceLab. O fluxo será: admin convida por e-mail → treinador recebe link → define senha → acessa o sistema. Inclui também um painel admin para gerenciar treinadores.

## Fluxo do usuário

1. **Admin** acessa `/admin/treinadores` e clica em "Convidar treinador" → informa nome + e-mail.
2. Sistema cria um convite (token único, validade 7 dias) e dispara um e-mail com link `/aceitar-convite?token=...`.
3. **Treinador** abre o link, vê seu nome/e-mail pré-preenchidos e define apenas a senha.
4. Conta é criada, perfil populado, convite marcado como usado e treinador é redirecionado ao `/dashboard`.
5. **Cadastro público (`/signup`) é desativado** — toda criação de conta passa pelo convite.

## Mudanças no banco

Nova tabela `coach_invites`:
- `email`, `full_name`, `token` (único), `invited_by` (admin), `status` (`pending` / `accepted` / `revoked` / `expired`), `expires_at`, `accepted_at`.

Nova tabela `user_roles` + enum `app_role` (`admin`, `coach`) seguindo o padrão de segurança recomendado (tabela separada + função `has_role` SECURITY DEFINER). Sem isso não há como diferenciar admin de treinador com segurança.

Atualizações:
- Trigger `handle_new_user` passará a também: (a) atribuir role `coach` por padrão, (b) consumir o convite correspondente ao e-mail (se houver) e usar o `full_name` do convite.
- RLS: apenas admins podem ler/criar/revogar convites. Token de convite é consultado por uma server function pública (sem expor a tabela inteira).

## Telas novas

1. **`/admin/treinadores`** (rota protegida, requer role `admin`)
   - Lista de treinadores cadastrados (nome, e-mail, data de criação, nº de alunos).
   - Lista de convites pendentes com ações: reenviar, revogar, copiar link.
   - Botão "Convidar treinador" abre modal (nome + e-mail).

2. **`/aceitar-convite`** (rota pública)
   - Valida token via server function. Mostra nome/e-mail do convite (read-only) e campo "Criar senha" + "Confirmar senha".
   - Em caso de token inválido/expirado/já usado, mostra mensagem clara.

3. **Item "Administração"** no menu lateral, visível apenas para admins.

4. **`/signup` desativado**: a página passa a explicar que o acesso é por convite e direciona para `/login`. O link "criar conta" do `/login` é removido.

## Como o primeiro admin é criado

Como ainda não há admins, o primeiro será promovido manualmente: depois que você criar sua própria conta de treinador, eu rodo um insert em `user_roles` atribuindo `admin` ao seu `user_id`. A partir daí você convida os demais treinadores pela própria interface.

## Envio do e-mail

O envio real do e-mail de convite exige configurar o domínio de e-mails do Lovable (passo único, leva alguns minutos para verificar o DNS). Sugestão de abordagem em duas fases para você não ficar bloqueado:

- **Fase 1 (agora):** criar todo o fluxo + tela admin. O modal de convite já gera o link `/aceitar-convite?token=...` e mostra um botão "Copiar link" para você enviar manualmente enquanto o domínio de e-mail não está configurado.
- **Fase 2 (quando quiser):** ativar o envio automático do e-mail de convite com template próprio (assunto, corpo, marca PaceLab).

## Server functions

- `createCoachInvite({ email, fullName })` — apenas admin; insere em `coach_invites`.
- `getInviteByToken({ token })` — pública; retorna apenas `email`, `full_name` e validade do convite.
- `acceptCoachInvite({ token, password })` — pública; cria o usuário no auth com o e-mail do convite, marca convite como usado.
- `revokeCoachInvite({ id })` / `resendCoachInvite({ id })` — admin.

## Detalhes técnicos

- Validação client + server com Zod (e-mail válido, senha mínima 8, nome 2-100).
- Token: `crypto.randomUUID()` + sufixo aleatório, armazenado em texto (tabela protegida por RLS; lookup só via server function).
- Validade padrão: 7 dias. Reenviar gera novo token.
- Sidebar usa `auth.user` + role para mostrar/esconder o item "Administração".
- `_authenticated` ganha rota filha `_admin` com `beforeLoad` que redireciona para `/dashboard` se o usuário não tiver role `admin`.

## Fora de escopo (para depois)

- Integração com gateway de pagamento (Stripe/Paddle) gerando convite automaticamente após a compra.
- Limite de alunos por treinador / planos.
- Auditoria detalhada de convites.
