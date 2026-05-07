
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'coach');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins see all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles insert" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles delete" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Invites
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');

CREATE TABLE public.coach_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX coach_invites_email_idx ON public.coach_invites(lower(email));
CREATE INDEX coach_invites_token_idx ON public.coach_invites(token);

ALTER TABLE public.coach_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view invites" ON public.coach_invites FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins create invites" ON public.coach_invites FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update invites" ON public.coach_invites FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete invites" ON public.coach_invites FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER coach_invites_updated_at BEFORE UPDATE ON public.coach_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public function to look up an invite by token (returns minimal info)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token TEXT)
RETURNS TABLE(email TEXT, full_name TEXT, status public.invite_status, expires_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email, full_name, status, expires_at FROM public.coach_invites WHERE token = _token
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon, authenticated;

-- Updated handle_new_user: consume invite + assign coach role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _invite RECORD;
  _name TEXT;
BEGIN
  SELECT * INTO _invite FROM public.coach_invites
   WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;

  _name := COALESCE(_invite.full_name, NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, _name);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coach') ON CONFLICT DO NOTHING;

  IF _invite.id IS NOT NULL THEN
    UPDATE public.coach_invites SET status = 'accepted', accepted_at = now() WHERE id = _invite.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
