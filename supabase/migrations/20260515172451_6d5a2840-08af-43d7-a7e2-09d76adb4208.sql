CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read app_settings" ON public.app_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update app_settings" ON public.app_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings(key, value) VALUES ('max_coaches', '4')
  ON CONFLICT (key) DO NOTHING;

-- Reforço no trigger handle_new_user para bloquear quando o limite for atingido
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invite RECORD;
  _name TEXT;
  _admin_created BOOLEAN;
  _limit INT;
  _current INT;
BEGIN
  _admin_created := COALESCE((NEW.raw_user_meta_data->>'created_by_admin')::boolean, false);

  SELECT * INTO _invite FROM public.coach_invites
   WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;

  IF _invite.id IS NULL AND NOT _admin_created THEN
    RAISE EXCEPTION 'Cadastro permitido apenas por convite.';
  END IF;

  -- Verifica limite de treinadores antes de atribuir a role
  SELECT COALESCE((SELECT value::int FROM public.app_settings WHERE key = 'max_coaches'), 4)
    INTO _limit;
  SELECT count(*) INTO _current FROM public.user_roles WHERE role = 'coach';
  IF _current >= _limit THEN
    RAISE EXCEPTION 'Limite de treinadores atingido (% de %).', _current, _limit
      USING ERRCODE = 'check_violation';
  END IF;

  _name := COALESCE(_invite.full_name, NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, _name);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coach') ON CONFLICT DO NOTHING;

  IF _invite.id IS NOT NULL THEN
    UPDATE public.coach_invites SET status = 'accepted', accepted_at = now() WHERE id = _invite.id;
  END IF;

  RETURN NEW;
END;
$function$;