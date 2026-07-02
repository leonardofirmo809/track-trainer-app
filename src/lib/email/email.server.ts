import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { EmailType, SendEmailParams, SendEmailResult } from "./types";

const CF_EMAIL_SEND_URL = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`;

function getEmailCredentials() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const from = process.env.EMAIL_FROM;
  if (!apiToken || !accountId || !from) return null;
  return { apiToken, accountId, from, replyTo: process.env.EMAIL_REPLY_TO || undefined };
}

// Envia um e-mail transacional via Cloudflare Email Service (REST API) e audita
// o resultado em `email_logs`. Nunca lança — falhas de envio não devem derrubar
// o fluxo que a originou (ex.: criação de convite continua válida mesmo se o
// e-mail falhar; o admin ainda pode copiar o link manualmente).
export async function sendEmail(
  type: EmailType,
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const creds = getEmailCredentials();
  if (!creds) {
    console.error(
      "[email] CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID/EMAIL_FROM não configurados — envio pulado",
    );
    await logEmail(type, params.to, "failed", null, "email provider not configured");
    return { ok: false, error: "email provider not configured" };
  }

  try {
    const res = await fetch(CF_EMAIL_SEND_URL(creds.accountId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.to,
        from: { address: creds.from, name: "8020Pace" },
        ...(creds.replyTo ? { reply_to: creds.replyTo } : {}),
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      success?: boolean;
      errors?: { message?: string }[];
      result?: { delivered?: string[]; permanent_bounces?: string[]; queued?: string[] };
    } | null;

    if (!res.ok || !body?.success) {
      const errorMsg = body?.errors?.[0]?.message ?? `HTTP ${res.status}`;
      console.error(`[email] send failed (${type}): ${errorMsg}`);
      await logEmail(type, params.to, "failed", null, errorMsg.slice(0, 500));
      return { ok: false, error: errorMsg };
    }

    await logEmail(type, params.to, "sent", null, null);
    return { ok: true, providerMessageId: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "unknown error";
    console.error(`[email] send threw (${type}): ${errorMsg}`);
    await logEmail(type, params.to, "failed", null, errorMsg.slice(0, 500));
    return { ok: false, error: errorMsg };
  }
}

async function logEmail(
  type: EmailType,
  recipient: string,
  status: "sent" | "failed",
  providerMessageId: string | null,
  error: string | null,
): Promise<void> {
  const { error: dbError } = await supabaseAdmin.from("email_logs").insert({
    recipient,
    email_type: type,
    status,
    provider_message_id: providerMessageId,
    error,
  });
  if (dbError) console.error(`[email] failed to write email_logs: ${dbError.message}`);
}
