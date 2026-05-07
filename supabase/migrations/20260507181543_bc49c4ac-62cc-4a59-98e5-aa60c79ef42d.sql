
-- Enums
CREATE TYPE public.student_level AS ENUM ('iniciante','intermediario','avancado');
CREATE TYPE public.target_distance AS ENUM ('5km','10km','21km','42km');
CREATE TYPE public.test_type AS ENUM ('3km','5km','10km','outro');
CREATE TYPE public.plan_type AS ENUM ('5km','10km','21km','42km');
CREATE TYPE public.plan_status AS ENUM ('ativa','concluida','arquivada');

-- Profiles (professores)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  gender TEXT,
  goal TEXT,
  level public.student_level,
  target_distance public.target_distance,
  injury_history TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach sees own students" ON public.students FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "coach inserts own students" ON public.students FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "coach updates own students" ON public.students FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "coach deletes own students" ON public.students FOR DELETE USING (auth.uid() = coach_id);
CREATE INDEX students_coach_id_idx ON public.students(coach_id);
CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tests
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_type public.test_type NOT NULL DEFAULT '3km',
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds INTEGER,
  pace_seconds_per_km INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach sees own tests" ON public.tests FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "coach inserts own tests" ON public.tests FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "coach updates own tests" ON public.tests FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "coach deletes own tests" ON public.tests FOR DELETE USING (auth.uid() = coach_id);
CREATE INDEX tests_student_id_idx ON public.tests(student_id);

-- Training plans
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type public.plan_type NOT NULL,
  start_date DATE,
  end_date DATE,
  status public.plan_status NOT NULL DEFAULT 'ativa',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach sees own plans" ON public.training_plans FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "coach inserts own plans" ON public.training_plans FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "coach updates own plans" ON public.training_plans FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "coach deletes own plans" ON public.training_plans FOR DELETE USING (auth.uid() = coach_id);
CREATE INDEX training_plans_student_id_idx ON public.training_plans(student_id);
CREATE TRIGGER training_plans_updated_at BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
