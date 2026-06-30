-- Tabela principal de integrações OAuth externas (Strava, etc.).
-- Tokens (access_token, refresh_token) são acessados APENAS via service_role
-- em server functions. Nenhuma policy de SELECT/INSERT/UPDATE/DELETE é criada
-- para o role 'authenticated', então consultas diretas pelo client JS retornam
-- dados vazios — os tokens nunca chegam ao browser.

CREATE TABLE IF NOT EXISTS public.user_integrations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         text        NOT NULL CHECK (provider IN ('strava')),
  provider_user_id text,
  access_token     text        NOT NULL DEFAULT '',
  refresh_token    text        NOT NULL DEFAULT '',
  expires_at       timestamptz,
  scopes           text[],
  status           text        NOT NULL DEFAULT 'connected'
                               CHECK (status IN ('connected', 'disconnected', 'error')),
  connected_at     timestamptz NOT NULL DEFAULT NOW(),
  disconnected_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT user_integrations_user_provider_unique UNIQUE (user_id, provider)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
-- Sem policies para 'authenticated': apenas service_role acessa esta tabela.

-- Estados temporários para proteção CSRF no fluxo OAuth.
-- Excluídos pelo callback handler após uso (one-time use).
CREATE TABLE IF NOT EXISTS public.strava_oauth_states (
  state      text        PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

ALTER TABLE public.strava_oauth_states ENABLE ROW LEVEL SECURITY;
-- Sem policies para 'authenticated': apenas service_role acessa esta tabela.
