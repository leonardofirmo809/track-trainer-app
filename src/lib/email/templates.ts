const LOGO_URL = "https://pub-87cb7b9bcf7a4d8097c43101ac0213ea.r2.dev/8020pace-logo.png";
const SUPPORT_EMAIL = "suporte@8020pace.com.br";

function layout(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
        <tr><td style="padding:32px 32px 0 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="8020Pace" height="32" style="height:32px;" />
        </td></tr>
        <tr><td style="padding:24px 32px 8px 32px;">
          <h1 style="margin:0;font-size:20px;line-height:28px;color:#18181b;">${opts.heading}</h1>
        </td></tr>
        <tr><td style="padding:8px 32px 0 32px;font-size:14px;line-height:22px;color:#3f3f46;">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">${opts.ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:0 32px 24px 32px;font-size:12px;line-height:18px;color:#71717a;">
          Se você não esperava este e-mail, pode ignorá-lo com segurança.
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;">
          8020Pace &middot; Dúvidas? <a href="mailto:${SUPPORT_EMAIL}" style="color:#a1a1aa;">${SUPPORT_EMAIL}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function coachInviteEmail(opts: { fullName: string; inviteUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Você foi convidado para treinar no 8020Pace";
  const html = layout({
    preheader: "Aceite o convite e crie sua senha de acesso.",
    heading: `Olá, ${opts.fullName}!`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Você foi convidado para acessar o <strong>8020Pace</strong> como treinador.</p>
      <p style="margin:0 0 12px 0;">Clique no botão abaixo para criar sua senha e começar a usar a plataforma. Este link expira em 7 dias.</p>
    `,
    ctaLabel: "Aceitar convite",
    ctaUrl: opts.inviteUrl,
  });
  const text = `Olá, ${opts.fullName}!

Você foi convidado para acessar o 8020Pace como treinador.

Aceite o convite e crie sua senha em: ${opts.inviteUrl}

Este link expira em 7 dias. Se você não esperava este e-mail, pode ignorá-lo com segurança.

Dúvidas? ${SUPPORT_EMAIL}`;
  return { subject, html, text };
}

export function coachWelcomeEmail(opts: { fullName: string; loginUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Bem-vindo ao 8020Pace";
  const html = layout({
    preheader: "Sua conta está pronta. Vamos começar.",
    heading: `Bem-vindo, ${opts.fullName}!`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Sua conta de treinador no <strong>8020Pace</strong> está pronta.</p>
      <p style="margin:0 0 12px 0;">Acesse a plataforma para cadastrar seus alunos e montar planilhas de treino.</p>
    `,
    ctaLabel: "Acessar o 8020Pace",
    ctaUrl: opts.loginUrl,
  });
  const text = `Bem-vindo, ${opts.fullName}!

Sua conta de treinador no 8020Pace está pronta.

Acesse: ${opts.loginUrl}

Dúvidas? ${SUPPORT_EMAIL}`;
  return { subject, html, text };
}
