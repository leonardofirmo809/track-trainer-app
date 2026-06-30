import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const CALLBACK_URL = "https://app.8020pace.com.br/integracoes/strava/callback";

function getStravaCredentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Response(
      "Integração Strava não configurada. Configure STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET.",
      { status: 503 }
    );
  }
  return { clientId, clientSecret };
}

// ── getStravaConnectUrl ───────────────────────────────────────────────────────
// Gera a URL de autorização Strava com state anti-CSRF armazenado no banco.

export const getStravaConnectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { clientId } = getStravaCredentials();

    // Gerar state aleatório de 16 bytes (32 hex chars)
    const stateBytes = new Uint8Array(16);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("");

    const { error } = await db
      .from("strava_oauth_states")
      .insert({ state, user_id: userId });
    if (error) {
      console.error("[Strava] Failed to store OAuth state");
      throw new Response("Erro ao iniciar autenticação Strava.", { status: 500 });
    }

    // Limpar states expirados oportunisticamente
    await db
      .from("strava_oauth_states")
      .delete()
      .lt("expires_at", new Date().toISOString());

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: CALLBACK_URL,
      response_type: "code",
      approval_prompt: "auto",
      scope: "read,activity:read_all",
      state,
    });

    return { url: `https://www.strava.com/oauth/authorize?${params.toString()}` };
  });

// ── handleStravaCallback ──────────────────────────────────────────────────────
// Valida o state, troca o code por tokens (server-side), salva a conexão.
// Tokens NUNCA são retornados ao client.

export const handleStravaCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { clientId, clientSecret } = getStravaCredentials();

    const { data: stored, error: stateErr } = await db
      .from("strava_oauth_states")
      .select("user_id, expires_at")
      .eq("state", data.state)
      .maybeSingle();

    if (stateErr || !stored) {
      throw new Response("State inválido. Tente conectar novamente.", { status: 400 });
    }
    if (stored.user_id !== userId) {
      throw new Response("State inválido para este usuário.", { status: 403 });
    }
    if (new Date(stored.expires_at as string) < new Date()) {
      await db.from("strava_oauth_states").delete().eq("state", data.state);
      throw new Response("Autenticação expirada. Tente conectar novamente.", { status: 400 });
    }

    // Uso único — remover state
    await db.from("strava_oauth_states").delete().eq("state", data.state);

    // Trocar code por tokens (server-side — client_secret nunca sai do servidor)
    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: data.code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[Strava] Token exchange failed:", tokenRes.status);
      throw new Response("Falha ao autenticar com o Strava.", { status: 502 });
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      athlete?: { id: number };
      scope?: string;
    };

    if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.athlete?.id) {
      console.error("[Strava] Unexpected token response");
      throw new Response("Resposta inválida do Strava.", { status: 502 });
    }

    const scopes = tokenData.scope
      ? tokenData.scope.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const expiresAtIso = tokenData.expires_at
      ? new Date(tokenData.expires_at * 1000).toISOString()
      : null;

    const { error: upsertErr } = await db.from("user_integrations").upsert(
      {
        user_id: userId,
        provider: "strava",
        provider_user_id: String(tokenData.athlete.id),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAtIso,
        scopes,
        status: "connected",
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    if (upsertErr) {
      console.error("[Strava] Upsert error");
      throw new Response("Erro ao salvar conexão Strava.", { status: 500 });
    }

    return { athleteId: String(tokenData.athlete.id) };
  });

// ── getStravaConnectionStatus ─────────────────────────────────────────────────
// Retorna apenas metadados seguros — sem tokens.

export const getStravaConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data } = await db
      .from("user_integrations")
      .select("provider_user_id, status, connected_at, scopes")
      .eq("user_id", userId)
      .eq("provider", "strava")
      .maybeSingle();

    if (!data || data.status !== "connected") {
      return { connected: false as const };
    }

    return {
      connected: true as const,
      athleteId: (data.provider_user_id ?? null) as string | null,
      connectedAt: data.connected_at as string,
      scopes: ((data.scopes ?? []) as string[]),
    };
  });

// ── disconnectStrava ──────────────────────────────────────────────────────────
// Marca a conexão como desconectada e limpa os tokens do banco.

export const disconnectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { error } = await db
      .from("user_integrations")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        access_token: "",
        refresh_token: "",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "strava");

    if (error) {
      console.error("[Strava] Disconnect error");
      throw new Response("Erro ao desconectar Strava.", { status: 500 });
    }

    return { success: true };
  });

// ── refreshStravaTokenIfNeeded (interno — não exportado) ──────────────────────
// Renova o access_token se expirar em menos de 5 minutos.
// Retorna o access_token válido para uso server-side APENAS.

async function refreshStravaTokenIfNeeded(userId: string): Promise<string> {
  const { clientId, clientSecret } = getStravaCredentials();

  const { data, error } = await db
    .from("user_integrations")
    .select("access_token, refresh_token, expires_at, status")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle();

  if (error || !data || data.status !== "connected") {
    throw new Response("Strava não está conectado.", { status: 400 });
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at as string) : new Date(0);
  const needsRefresh = expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (!needsRefresh) return data.access_token as string;

  const refreshRes = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: data.refresh_token as string,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) {
    console.error("[Strava] Token refresh failed:", refreshRes.status);
    throw new Response("Falha ao renovar token do Strava.", { status: 502 });
  }

  const refreshData = (await refreshRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  await db
    .from("user_integrations")
    .update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "strava");

  return refreshData.access_token;
}

// ── listStravaActivities ──────────────────────────────────────────────────────
// Busca as últimas 50 atividades de corrida do atleta autenticado.
// Renova o token se necessário. Retorna apenas campos seguros/relevantes.

export const listStravaActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const accessToken = await refreshStravaTokenIfNeeded(userId);

    const params = new URLSearchParams({ per_page: "50", page: "1" });
    const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error("[Strava] Activities fetch failed:", res.status);
      throw new Response("Falha ao buscar atividades do Strava.", { status: 502 });
    }

    const activities = (await res.json()) as Array<{
      id: number;
      name: string;
      type: string;
      sport_type: string;
      distance: number;
      moving_time: number;
      average_speed: number;
      start_date: string;
      total_elevation_gain: number;
    }>;

    return activities
      .filter((a) => a.type === "Run" || a.sport_type === "Run")
      .map((a) => ({
        id: String(a.id),
        name: a.name,
        distanceM: a.distance,
        movingTimeSec: a.moving_time,
        paceSec: a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null,
        startDate: a.start_date,
        elevationGainM: a.total_elevation_gain,
      }));
  });
