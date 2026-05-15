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
BEGIN
  _admin_created := COALESCE((NEW.raw_user_meta_data->>'created_by_admin')::boolean, false);

  SELECT * INTO _invite FROM public.coach_invites
   WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;

  IF _invite.id IS NULL AND NOT _admin_created THEN
    RAISE EXCEPTION 'Cadastro permitido apenas por convite.';
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