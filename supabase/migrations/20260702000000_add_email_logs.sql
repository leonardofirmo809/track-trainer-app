
-- Operational email audit log (Category B emails: invites, welcome, future notifications).
-- Supabase Auth's own emails (signup confirmation, password recovery) are NOT logged here —
-- those are handled entirely by Supabase's mail pipeline and have their own dashboard.
CREATE TYPE public.email_status AS ENUM ('sent', 'failed');

CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status public.email_status NOT NULL,
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_logs_recipient_idx ON public.email_logs(lower(recipient));
CREATE INDEX email_logs_created_idx ON public.email_logs(created_at DESC);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only global admins can read email logs; writes happen exclusively via the
-- service-role client from server functions (supabaseAdmin bypasses RLS).
CREATE POLICY "admins read email logs" ON public.email_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
