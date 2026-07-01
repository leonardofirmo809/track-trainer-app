-- Atividades Strava persistidas por aluno.
-- INSERT/UPDATE feitos via service_role em server functions.
-- SELECT: usuário vê apenas as próprias atividades via RLS.
-- Treinador acessa via server function com assertCanManageStudentTraining.

CREATE TABLE IF NOT EXISTS public.strava_activities (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_activity_id          text        NOT NULL,
  name                        text,
  sport_type                  text,
  start_date                  timestamptz,
  distance_meters             numeric,
  moving_time_seconds         integer,
  elapsed_time_seconds        integer,
  average_speed_mps           numeric,
  average_pace_seconds_per_km numeric,
  total_elevation_gain        numeric,
  average_heartrate           numeric,
  max_heartrate               numeric,
  calories                    numeric,
  raw_payload                 jsonb,
  synced_at                   timestamptz NOT NULL DEFAULT NOW(),
  created_at                  timestamptz NOT NULL DEFAULT NOW(),
  updated_at                  timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT strava_activities_user_activity_unique UNIQUE (user_id, strava_activity_id)
);

ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

-- Aluno vê apenas as próprias atividades
CREATE POLICY "user sees own strava activities"
  ON public.strava_activities FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Sem policies INSERT/UPDATE/DELETE para authenticated:
-- toda escrita é via supabaseAdmin (service_role) em server functions.
