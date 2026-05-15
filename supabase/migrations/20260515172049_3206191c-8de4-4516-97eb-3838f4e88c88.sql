ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Backfill: usuários existentes com nome já definido não passam pelo onboarding
UPDATE public.profiles SET onboarding_completed = true WHERE full_name IS NOT NULL AND full_name <> '';