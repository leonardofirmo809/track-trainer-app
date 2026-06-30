import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Link2, CheckCircle2, AlertCircle, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getStravaConnectUrl,
  getStravaConnectionStatus,
  disconnectStrava,
  listStravaActivities,
} from "@/lib/strava.functions";

export const Route = createFileRoute("/_authenticated/minha-conta")({ component: MinhaConta });

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtPace(paceSec: number | null): string {
  if (!paceSec || paceSec <= 0) return "—";
  const m = Math.floor(paceSec / 60);
  const s = paceSec % 60;
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDist(m: number): string {
  return (m / 1000).toFixed(2) + " km";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── StravaCard ────────────────────────────────────────────────────────────────

function StravaCard() {
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const statusQ = useQuery({
    queryKey: ["strava-status"],
    queryFn: () => getStravaConnectionStatus(),
    staleTime: 30_000,
  });

  const activitiesQ = useQuery({
    queryKey: ["strava-activities"],
    queryFn: () => listStravaActivities(),
    enabled: showActivities,
    staleTime: 120_000,
  });

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await getStravaConnectUrl();
      window.location.href = url;
    } catch (e) {
      toast.error("Erro ao iniciar conexão com o Strava.");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Desconectar o Strava? Suas atividades não serão mais acessíveis neste sistema.")) return;
    setDisconnecting(true);
    try {
      await disconnectStrava();
      toast.success("Strava desconectado.");
      setShowActivities(false);
      await qc.invalidateQueries({ queryKey: ["strava-status"] });
      await qc.invalidateQueries({ queryKey: ["strava-activities"] });
    } catch {
      toast.error("Erro ao desconectar o Strava.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setShowActivities(true);
    try {
      await qc.invalidateQueries({ queryKey: ["strava-activities"] });
      await activitiesQ.refetch();
      toast.success("Atividades sincronizadas.");
    } catch {
      toast.error("Erro ao buscar atividades do Strava.");
    } finally {
      setSyncing(false);
    }
  }

  if (statusQ.isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Strava</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </CardContent>
      </Card>
    );
  }

  if (statusQ.isError) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <CardTitle className="text-base">Strava</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Erro ao verificar status da integração.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => void statusQ.refetch()}
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = statusQ.data;
  const connected = status?.connected === true;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Strava</CardTitle>
              {connected && (
                <Badge
                  variant="outline"
                  className="text-xs border-emerald-500 text-emerald-600 bg-emerald-50"
                >
                  <CheckCircle2 className="size-3 mr-1" />
                  Conectado
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            {connected
              ? "Sua conta Strava está conectada. Sincronize para ver suas corridas."
              : "Conecte sua conta Strava para visualizar suas atividades de corrida nesta plataforma."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && status.connected ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {status.athleteId && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Atleta Strava</p>
                    <p className="font-medium">#{status.athleteId}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Conectado em</p>
                  <p className="font-medium">{fmtDate(status.connectedAt)}</p>
                </div>
                {status.scopes.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Permissões</p>
                    <div className="flex flex-wrap gap-1">
                      {status.scopes.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => void handleSync()}
                  disabled={syncing}
                >
                  <RefreshCw className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Sincronizando…" : "Sincronizar atividades"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDisconnect()}
                  disabled={disconnecting}
                >
                  <Unlink />
                  {disconnecting ? "Desconectando…" : "Desconectar"}
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={() => void handleConnect()}
              disabled={connecting}
              style={{ backgroundColor: "#FC4C02", color: "#fff" }}
              className="hover:opacity-90"
            >
              <Link2 />
              {connecting ? "Redirecionando…" : "Conectar Strava"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Atividades ─────────────────────────────────────────────────── */}
      {showActivities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas corridas — Strava</CardTitle>
            {activitiesQ.isLoading && (
              <CardDescription>Carregando atividades…</CardDescription>
            )}
            {activitiesQ.isError && (
              <CardDescription className="text-destructive">
                Falha ao carregar atividades. Verifique sua conexão e tente novamente.
              </CardDescription>
            )}
          </CardHeader>
          {activitiesQ.data && (
            <CardContent>
              {activitiesQ.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma corrida encontrada nas últimas 50 atividades.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left pb-2 pr-4">Data</th>
                        <th className="text-left pb-2 pr-4">Nome</th>
                        <th className="text-right pb-2 pr-4">Distância</th>
                        <th className="text-right pb-2 pr-4">Tempo</th>
                        <th className="text-right pb-2 pr-4">Pace</th>
                        <th className="text-right pb-2">Desnível</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activitiesQ.data.map((a) => (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground text-xs">
                            {fmtDate(a.startDate)}
                          </td>
                          <td className="py-2 pr-4 max-w-[180px] truncate font-medium">
                            {a.name}
                          </td>
                          <td className="py-2 pr-4 text-right whitespace-nowrap">
                            {fmtDist(a.distanceM)}
                          </td>
                          <td className="py-2 pr-4 text-right whitespace-nowrap">
                            {fmtDuration(a.movingTimeSec)}
                          </td>
                          <td className="py-2 pr-4 text-right whitespace-nowrap">
                            {fmtPace(a.paceSec)}
                          </td>
                          <td className="py-2 text-right whitespace-nowrap text-muted-foreground">
                            {a.elevationGainM > 0 ? `+${Math.round(a.elevationGainM)}m` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

// ── MinhaConta ────────────────────────────────────────────────────────────────

function MinhaConta() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  function validate() {
    const e: { password?: string; confirm?: string } = {};
    if (password.length < 8) e.password = "A senha deve ter no mínimo 8 caracteres.";
    if (password !== confirm) e.confirm = "As senhas não coincidem.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setPassword("");
      setConfirm("");
      setErrors({});
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Minha conta</h1>
        <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Alterar senha</CardTitle>
          </div>
          <CardDescription>Nova senha com no mínimo 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {errors.confirm && (
                <p className="text-sm text-destructive">{errors.confirm}</p>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Integrações */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Integrações</h2>
        <StravaCard />
      </div>
    </div>
  );
}
