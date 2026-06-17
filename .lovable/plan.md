## Problema

O erro **"Signups not allowed for this instance"** vem da configuração do Auth do backend, que está com cadastros desabilitados. Por isso o formulário `/cadastro-treinador` não consegue criar a conta, mesmo com todos os campos preenchidos.

## Correção

1. Ativar `enable_signup` nas configurações do Auth (via `configure_auth`), permitindo que novos usuários se cadastrem.
2. Manter `enable_confirmations` no estado atual (sem auto-confirm de e-mail) — o fluxo de aprovação por admin continua funcionando: o usuário cria a conta → entra na tabela `coach_applications` como `pending` → login bloqueado até aprovação.
3. Não mexer em RLS, triggers ou no formulário — eles já estão corretos; o bloqueio é só a flag global de signup.

Depois disso, basta tentar o cadastro novamente na mesma tela.
