import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertCanManageStudentTraining } from "@/lib/company-permissions.server";

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
      return { connected: false as const, needsReconnect: data?.status === "error" };
    }

    return {
      connected: true as const,
      athleteId: (data.provider_user_id ?? null) as string | null,
      connectedAt: data.connected_at as string,
      scopes: ((data.scopes ?? []) as string[]),
    };
  });

// ── disconnectStrava ──────────────────────────────────────────────────────────
// Revoga o token no Strava (oauth/revoke) e limpa a conexão local.
// Se revogação falhar por 5xx/rede, marca status='error' sem limpar tokens.
// 4xx do Strava = token já inválido → procede com limpeza local.

export const disconnectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Ler tokens antes de limpar para tentar revogação no Strava
    const { data: integration } = await db
      .from("user_integrations")
      .select("refresh_token, access_token")
      .eq("user_id", userId)
      .eq("provider", "strava")
      .maybeSingle();

    if (!integration) {
      throw new Response("Conexão Strava não encontrada.", { status: 404 });
    }

    const { clientId, clientSecret } = getStravaCredentials();
    const tokenToRevoke =
      (integration.refresh_token as string) || (integration.access_token as string);
    let revokeOk = false;

    if (tokenToRevoke) {
      const basicCred = btoa(`${clientId}:${clientSecret}`);
      try {
        const revokeRes = await fetch("https://www.strava.com/oauth/revoke", {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicCred}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            token: tokenToRevoke,
            token_type_hint: "refresh_token",
          }).toString(),
        });
        // 2xx = sucesso; 4xx = token já inválido no Strava — ambos permitem limpeza local
        revokeOk = revokeRes.ok || (revokeRes.status >= 400 && revokeRes.status < 500);
        if (!revokeOk) {
          console.error("[Strava] Revoke failed:", revokeRes.status);
        }
      } catch {
        console.error("[Strava] Revoke request failed — network error");
      }
    } else {
      revokeOk = true; // sem token para revogar
    }

    if (!revokeOk) {
      // Strava indisponível — manter tokens, marcar como error para retry
      await db
        .from("user_integrations")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", "strava");
      throw new Response(
        "Não foi possível revogar o acesso no Strava. Tente novamente ou acesse strava.com/settings/apps para revogar manualmente.",
        { status: 502 }
      );
    }

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
      console.error("[Strava] Disconnect update error");
      throw new Response("Erro ao atualizar status da conexão.", { status: 500 });
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
    const is4xx = refreshRes.status >= 400 && refreshRes.status < 500;
    console.error("[Strava] Token refresh failed:", refreshRes.status);
    if (is4xx) {
      // Token revogado ou inválido — marcar conexão como error para UI mostrar reconexão
      await db
        .from("user_integrations")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", "strava");
      throw new Response(
        "Token do Strava expirou ou foi revogado. Reconecte o Strava em Minha Conta.",
        { status: 401 }
      );
    }
    throw new Response("Falha ao renovar token do Strava. Tente novamente.", { status: 502 });
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

// ── shared types / helpers ────────────────────────────────────────────────────

type ActivityRow = {
  id: string;
  stravaId: string;
  name: string | null;
  sportType: string | null;
  startDate: string | null;
  distanceM: number | null;
  movingTimeSec: number | null;
  paceSec: number | null;
  elevationGainM: number | null;
  avgHeartrate: number | null;
  syncedAt: string;
};

function rowToActivity(r: Record<string, unknown>): ActivityRow {
  return {
    id: r.id as string,
    stravaId: r.strava_activity_id as string,
    name: (r.name as string | null) ?? null,
    sportType: (r.sport_type as string | null) ?? null,
    startDate: (r.start_date as string | null) ?? null,
    distanceM: (r.distance_meters as number | null) ?? null,
    movingTimeSec: (r.moving_time_seconds as number | null) ?? null,
    paceSec: (r.average_pace_seconds_per_km as number | null) ?? null,
    elevationGainM: (r.total_elevation_gain as number | null) ?? null,
    avgHeartrate: (r.average_heartrate as number | null) ?? null,
    syncedAt: r.synced_at as string,
  };
}

const ACTIVITY_SELECT =
  "id, strava_activity_id, name, sport_type, start_date, distance_meters, moving_time_seconds, average_pace_seconds_per_km, total_elevation_gain, average_heartrate, synced_at";

// ── syncStravaActivities ──────────────────────────────────────────────────────
// Busca as últimas 50 atividades do Strava, filtra corridas e persiste no banco.
// Retorna resumo sem tokens.

export const syncStravaActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const accessToken = await refreshStravaTokenIfNeeded(userId);

    const params = new URLSearchParams({ per_page: "50", page: "1" });
    const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.error("[Strava] Rate limit hit");
        throw new Response(
          "Limite do Strava atingido. Aguarde alguns minutos e tente novamente.",
          { status: 429 }
        );
      }
      console.error("[Strava] Activities fetch failed:", res.status);
      throw new Response("Falha ao buscar atividades do Strava.", { status: 502 });
    }

    const raw = (await res.json()) as Array<{
      id: number;
      name: string;
      type: string;
      sport_type: string;
      distance: number;
      moving_time: number;
      elapsed_time: number;
      average_speed: number;
      start_date: string;
      total_elevation_gain: number;
      average_heartrate?: number;
      max_heartrate?: number;
      calories?: number;
    }>;

    const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
    const runs = raw.filter((a) => RUN_TYPES.has(a.sport_type) || RUN_TYPES.has(a.type));

    if (runs.length === 0) {
      return { saved: 0, total: raw.length, message: "Nenhuma corrida encontrada." };
    }

    const now = new Date().toISOString();
    const rows = runs.map((a) => ({
      user_id: userId,
      strava_activity_id: String(a.id),
      name: a.name,
      sport_type: a.sport_type || a.type,
      start_date: a.start_date,
      distance_meters: a.distance,
      moving_time_seconds: a.moving_time,
      elapsed_time_seconds: a.elapsed_time,
      average_speed_mps: a.average_speed,
      average_pace_seconds_per_km:
        a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null,
      total_elevation_gain: a.total_elevation_gain,
      average_heartrate: a.average_heartrate ?? null,
      max_heartrate: a.max_heartrate ?? null,
      calories: a.calories ?? null,
      raw_payload: a as unknown as Record<string, unknown>,
      synced_at: now,
      updated_at: now,
    }));

    const { error } = await db
      .from("strava_activities")
      .upsert(rows, { onConflict: "user_id,strava_activity_id" });

    if (error) {
      console.error("[Strava] Upsert activities error");
      throw new Response("Erro ao salvar atividades.", { status: 500 });
    }

    return { saved: runs.length, total: raw.length, message: null as string | null };
  });

// ── getMyStravaActivities ─────────────────────────────────────────────────────
// Lê as atividades persistidas do usuário autenticado. Sem tokens na resposta.

export const getMyStravaActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data, error } = await db
      .from("strava_activities")
      .select(ACTIVITY_SELECT)
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Strava] getMyStravaActivities error");
      throw new Response("Erro ao buscar atividades.", { status: 500 });
    }

    return ((data ?? []) as unknown as Record<string, unknown>[]).map(rowToActivity);
  });

// ── getStudentStravaActivities ────────────────────────────────────────────────
// Para uso do treinador: verifica permissão e retorna atividades do aluno.

export const getStudentStravaActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const student = await assertCanManageStudentTraining(data.studentId, userId);
    const studentUserId = student.user_id;

    if (!studentUserId) {
      return { stravaConnected: false, activities: [] as ActivityRow[] };
    }

    const { data: integration } = await db
      .from("user_integrations")
      .select("status")
      .eq("user_id", studentUserId)
      .eq("provider", "strava")
      .maybeSingle();

    if (!integration || integration.status !== "connected") {
      return { stravaConnected: false, activities: [] as ActivityRow[] };
    }

    const { data: rows, error } = await db
      .from("strava_activities")
      .select(ACTIVITY_SELECT)
      .eq("user_id", studentUserId)
      .order("start_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Strava] getStudentStravaActivities error");
      throw new Response("Erro ao buscar atividades do aluno.", { status: 500 });
    }

    return {
      stravaConnected: true,
      activities: ((rows ?? []) as unknown as Record<string, unknown>[]).map(rowToActivity),
    };
  });
