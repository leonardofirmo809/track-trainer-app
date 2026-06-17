
-- 1) Add phone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2) Coach application status enum
DO $$ BEGIN
  CREATE TYPE public.coach_application_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Applications table
CREATE TABLE IF NOT EXISTS public.coach_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status public.coach_application_status NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT ON public.coach_applications TO authenticated;
GRANT ALL ON public.coach_applications TO service_role;

ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own application" ON public.coach_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user inserts own application" ON public.coach_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin reads all applications" ON public.coach_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates applications" ON public.coach_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER coach_applications_updated_at
  BEFORE UPDATE ON public.coach_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Updated handle_new_user: remove max_coaches gate; add coach_application path
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invite RECORD;
  _name TEXT;
  _phone TEXT;
  _admin_created BOOLEAN;
  _signup_type TEXT;
BEGIN
  _admin_created := COALESCE((NEW.raw_user_meta_data->>'created_by_admin')::boolean, false);
  _signup_type := NEW.raw_user_meta_data->>'signup_type';
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  _phone := NEW.raw_user_meta_data->>'phone';

  IF _signup_type = 'runner' THEN
    INSERT INTO public.profiles (id, full_name, phone) VALUES (NEW.id, _name, _phone)
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'runner') ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  -- Coach self-service application: no role granted yet, awaits admin approval
  IF _signup_type = 'coach_application' THEN
    INSERT INTO public.profiles (id, full_name, phone) VALUES (NEW.id, _name, _phone)
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.coach_applications (user_id, full_name, email, phone)
      VALUES (NEW.id, _name, NEW.email, _phone)
      ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Invite or admin-created coach (legacy flow, no limit)
  SELECT * INTO _invite FROM public.coach_invites
   WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;

  IF _invite.id IS NULL AND NOT _admin_created THEN
    RAISE EXCEPTION 'Cadastro permitido apenas por convite.';
  END IF;

  _name := COALESCE(_invite.full_name, _name);

  INSERT INTO public.profiles (id, full_name, phone) VALUES (NEW.id, _name, _phone)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coach') ON CONFLICT DO NOTHING;

  IF _invite.id IS NOT NULL THEN
    UPDATE public.coach_invites SET status = 'accepted', accepted_at = now() WHERE id = _invite.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Admin actions
CREATE OR REPLACE FUNCTION public.approve_coach_application(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar.';
  END IF;
  SELECT user_id INTO _user_id FROM public.coach_applications WHERE id = _application_id;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'coach') ON CONFLICT DO NOTHING;
  UPDATE public.coach_applications
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _application_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_coach_application(_application_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem rejeitar.';
  END IF;
  UPDATE public.coach_applications
    SET status = 'rejected', notes = _notes, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _application_id;
END;
$$;
