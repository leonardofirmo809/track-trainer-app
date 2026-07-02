# Configuração manual — Supabase Auth Emails

Este documento cobre os ajustes que **precisam ser feitos manualmente no painel do
Supabase** (não são versionados em código). Nenhum destes itens é aplicado por
migration ou deploy.

Projeto: `eyivvedcwecrgpuijoyy` — https://supabase.com/dashboard/project/eyivvedcwecrgpuijoyy

## Fluxo de e-mail atual do produto

1. O link de acesso (cadastro de treinador ou corredor) é enviado manualmente,
   fora do sistema, por quem está convidando.
2. A pessoa acessa `/cadastro-treinador` ou `/cadastro-corredor` e cria a
   própria conta com `supabase.auth.signUp`.
3. Se a confirmação de e-mail estiver ativada no painel, o Supabase envia o
   e-mail de confirmação automaticamente — o app não precisa (nem deve) enviar
   nada nesse momento.
4. Se o usuário esquecer a senha, usa `/recuperar-senha`, que chama
   `resetPasswordForEmail` — o Supabase envia o e-mail de recuperação.

Não há envio operacional automático hoje (a camada `src/lib/email/` existe mas
está desconectada — ver nota no topo de `email.server.ts`).

## 1. Authentication → URL Configuration

- **Site URL**: `https://app.8020pace.com.br`
- **Redirect URLs** (adicionar todas):
  - `https://app.8020pace.com.br/*`
  - `https://app.8020pace.com.br/nova-senha`
  - `https://tanstack-start-app.leonardofirmo809.workers.dev/*` — manter **apenas**
    se ainda for usado como URL de preview/staging. Remover quando não for mais
    necessário.

## 2. Authentication → SMTP Settings

O SMTP padrão do Supabase tem limite baixo de envio (poucos e-mails por hora) e
não é recomendado para produção — pode causar falhas silenciosas na
confirmação de cadastro e na recuperação de senha sob uso real.

Configurar um SMTP customizado (ex.: Resend SMTP, Postmark, Amazon SES, Brevo)
com o domínio `8020pace.com.br` autenticado (SPF/DKIM). Campos necessários no
painel:

- Host / Porta / Usuário / Senha do provedor SMTP escolhido
- Sender email: algo como `no-reply@app.8020pace.com.br` ou `no-reply@8020pace.com.br`
- Sender name: `8020Pace`

## 3. Authentication → Email Templates

Ajustar os templates abaixo. Variáveis do Supabase: `{{ .ConfirmationURL }}`,
`{{ .Token }}`, `{{ .SiteURL }}`.

### Confirm signup

**Assunto:** Confirme seu acesso ao 8020Pace

**Corpo (HTML simplificado):**

```
Olá,

Seu cadastro no 8020Pace foi criado com sucesso.

Para confirmar seu acesso, clique no botão abaixo:

[Confirmar acesso] → {{ .ConfirmationURL }}

Se você não solicitou este cadastro, ignore este e-mail.

Equipe 8020Pace
```

### Reset password

**Assunto:** Redefina sua senha no 8020Pace

**Corpo (HTML simplificado):**

```
Olá,

Recebemos uma solicitação para redefinir a senha da sua conta no 8020Pace.

Clique no botão abaixo para criar uma nova senha:

[Redefinir senha] → {{ .ConfirmationURL }}

Se você não solicitou essa alteração, ignore este e-mail.

Equipe 8020Pace
```

### Change email (se aplicável)

Só é relevante se o app expuser troca de e-mail autenticada (hoje não expõe —
`minha-conta.tsx` só permite troca de senha). Se for habilitado no futuro,
usar copy no mesmo tom, confirmando o e-mail novo com aviso de segurança
("se você não solicitou, ignore este e-mail").

## 4. O que NÃO fazer

- Não desativar a confirmação de e-mail no painel sem alinhar com o time —
  isso muda o comportamento de `cadastro-corredor.tsx`/`cadastro-treinador.tsx`,
  que já se adaptam dinamicamente (tentam login imediato após `signUp`; se
  falhar, assumem que a confirmação está ativa).
- Não duplicar o envio de confirmação/recuperação no código do app — isso é
  responsabilidade exclusiva do Supabase Auth.
