export type EmailType = "coach_invite" | "coach_welcome";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };
