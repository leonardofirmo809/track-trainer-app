
-- 1) Schema changes on students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.students ALTER COLUMN coach_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_owner_present') THEN
    ALTER TABLE public.students ADD CONSTRAINT students_owner_present CHECK (coach_id IS NOT NULL OR user_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS students_user_id_idx ON public.students(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_user_id_unique ON public.students(user_id) WHERE user_id IS NOT NULL;

-- 2) Profiles: runner onboarding fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal_distance text NULL,
  ADD COLUMN IF NOT EXISTS goal_level integer NULL,
  ADD COLUMN IF NOT EXISTS race_date date NULL,
  ADD COLUMN IF NOT EXISTS runner_onboarding_completed boolean NOT NULL DEFAULT false;

-- 3) RLS — runner can manage own student row
DROP POLICY IF EXISTS "runner sees own student" ON public.students;
CREATE POLICY "runner sees own student" ON public.students FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "runner inserts own student" ON public.students;
CREATE POLICY "runner inserts own student" ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND coach_id IS NULL AND public.has_role(auth.uid(), 'runner'::public.app_role)
  );

DROP POLICY IF EXISTS "runner updates own student" ON public.students;
CREATE POLICY "runner updates own student" ON public.students FOR UPDATE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND coach_id IS NULL);

DROP POLICY IF EXISTS "runner deletes own student" ON public.students;
CREATE POLICY "runner deletes own student" ON public.students FOR DELETE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 4) RLS — training_plans accessible by runner who owns the student
DROP POLICY IF EXISTS "runner sees own plans" ON public.training_plans;
CREATE POLICY "runner sees own plans" ON public.training_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = training_plans.student_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "runner inserts own plans" ON public.training_plans;
CREATE POLICY "runner inserts own plans" ON public.training_plans FOR INSERT TO authenticated
  WITH CHECK (
    coach_id IS NULL
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = training_plans.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "runner updates own plans" ON public.training_plans;
CREATE POLICY "runner updates own plans" ON public.training_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = training_plans.student_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = training_plans.student_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "runner deletes own plans" ON public.training_plans;
CREATE POLICY "runner deletes own plans" ON public.training_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = training_plans.student_id AND s.user_id = auth.uid()));

-- Allow coach_id null in training_plans for runner-owned plans
ALTER TABLE public.training_plans ALTER COLUMN coach_id DROP NOT NULL;

-- 5) RLS — tests accessible by runner who owns the student
DROP POLICY IF EXISTS "runner sees own tests" ON public.tests;
CREATE POLICY "runner sees own tests" ON public.tests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = tests.student_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "runner inserts own tests" ON public.tests;
CREATE POLICY "runner inserts own tests" ON public.tests FOR INSERT TO authenticated
  WITH CHECK (
    coach_id IS NULL
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = tests.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "runner updates own tests" ON public.tests;
CREATE POLICY "runner updates own tests" ON public.tests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = tests.student_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = tests.student_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "runner deletes own tests" ON public.tests;
CREATE POLICY "runner deletes own tests" ON public.tests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = tests.student_id AND s.user_id = auth.uid()));

ALTER TABLE public.tests ALTER COLUMN coach_id DROP NOT NULL;

-- 6) handle_new_user — recognize runners and skip coach limits/invite for them
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
  _signup_type TEXT;
  _limit INT;
  _current INT;
BEGIN
  _admin_created := COALESCE((NEW.raw_user_meta_data->>'created_by_admin')::boolean, false);
  _signup_type := NEW.raw_user_meta_data->>'signup_type';

  -- Runner self-service signup: no invite, no coach license check
  IF _signup_type = 'runner' THEN
    _name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
    INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, _name)
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'runner') ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  SELECT * INTO _invite FROM public.coach_invites
   WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;

  IF _invite.id IS NULL AND NOT _admin_created THEN
    RAISE EXCEPTION 'Cadastro permitido apenas por convite.';
  END IF;

  SELECT COALESCE((SELECT value::int FROM public.app_settings WHERE key = 'max_coaches'), 4)
    INTO _limit;
  SELECT count(*) INTO _current FROM public.user_roles WHERE role = 'coach';
  IF _current >= _limit THEN
    RAISE EXCEPTION 'Limite de treinadores atingido (% de %).', _current, _limit
      USING ERRCODE = 'check_violation';
  END IF;

  _name := COALESCE(_invite.full_name, NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, _name)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coach') ON CONFLICT DO NOTHING;

  IF _invite.id IS NOT NULL THEN
    UPDATE public.coach_invites SET status = 'accepted', accepted_at = now() WHERE id = _invite.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 7) get_students_last_activity: also include runner's own student
CREATE OR REPLACE FUNCTION public.get_students_last_activity()
 RETURNS TABLE(student_id uuid, last_test_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.student_id, MAX(t.created_at) AS last_test_at
  FROM public.tests t
  JOIN public.students s ON s.id = t.student_id
  WHERE s.coach_id = auth.uid()
     OR s.user_id = auth.uid()
     OR public.has_role(auth.uid(), 'admin')
  GROUP BY t.student_id;
$function$;
