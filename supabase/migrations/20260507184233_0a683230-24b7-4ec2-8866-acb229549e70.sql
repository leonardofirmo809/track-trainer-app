
CREATE TYPE public.audit_event AS ENUM (
  'invite_created', 'invite_revoked', 'invite_resent', 'invite_accepted', 'coach_created_manual'
);

CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.audit_event NOT NULL,
  target_email TEXT,
  target_user_id UUID,
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit" ON public.admin_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to log invite events
CREATE OR REPLACE FUNCTION public.log_invite_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _event public.audit_event;
  _actor UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log(event_type, target_email, actor_id, metadata)
    VALUES ('invite_created', NEW.email, NEW.invited_by, jsonb_build_object('invite_id', NEW.id, 'full_name', NEW.full_name));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'revoked' THEN _event := 'invite_revoked';
      ELSIF NEW.status = 'accepted' THEN _event := 'invite_accepted';
      ELSIF NEW.status = 'pending' AND OLD.status = 'revoked' THEN _event := 'invite_resent';
      ELSE RETURN NEW;
      END IF;
      _actor := COALESCE(auth.uid(), NEW.invited_by);
      INSERT INTO public.admin_audit_log(event_type, target_email, actor_id, metadata)
      VALUES (_event, NEW.email, _actor, jsonb_build_object('invite_id', NEW.id));
    ELSIF NEW.token IS DISTINCT FROM OLD.token AND NEW.status = 'pending' THEN
      INSERT INTO public.admin_audit_log(event_type, target_email, actor_id, metadata)
      VALUES ('invite_resent', NEW.email, COALESCE(auth.uid(), NEW.invited_by), jsonb_build_object('invite_id', NEW.id));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER coach_invites_audit
AFTER INSERT OR UPDATE ON public.coach_invites
FOR EACH ROW EXECUTE FUNCTION public.log_invite_event();

-- Admin read access to students and tests
CREATE POLICY "admins see all students" ON public.students FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins see all tests" ON public.tests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
