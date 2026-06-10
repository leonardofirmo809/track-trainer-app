import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Calendar, Route as RouteIcon, RefreshCw, FileText, Trophy, ChevronRight, Layers, Target,
} from "lucide-react";
import { getRunnerOverview } from "@/lib/runner.functions";
import { useAuth } from "@/lib/auth-context";
import { formatMmss } from "@/lib/teste-3km";

export const Route = createFileRoute("/_authenticated/corredor/")({ component: RunnerHome });

const DIST_LABEL: Record<string, string> = { "10km": "10KM", "21km": "21KM (Meia)", "42km": "42KM (Maratona)" };

function RunnerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const getOverview = useServerFn(getRunnerOverview);
  const overviewQ = useQuery({
    queryKey: ["runner-overview", user?.id],
    queryFn: () => getOverview(),
    enabled: !!user,
  });

  useEffect(() => {
    if (overviewQ.data && !overviewQ.data.profile?.runner_onboarding_completed) {
      navigate({ to: "/corredor/onboarding" });
    }
  }, [overviewQ.data, navigate]);

  const profile = overviewQ.data?.profile;
  const goal = profile?.goal_distance as "10km" | "21km" | "42km" | null | undefined;
  const planUrl = goal ? `/planilha-${goal}` : null;
  const activePlan = overviewQ.data?.activePlan;
  const lastTest = overviewQ.data?.lastTest;

  const phase = (() => {
    const p = (activePlan?.payload as { currentPhase?: number } | null)?.currentPhase;
    return p && p >= 1 && p <= 4 ? p : 1;
  })();
  const weekDays = ((activePlan?.payload as { weekDays?: string[] } | null)?.weekDays) ?? [];
  const level = ((activePlan?.payload as { level?: number } | null)?.level) ?? profile?.goal_level ?? 1;

  const daysToRace = profile?.race_date
    ? Math.max(0, Math.ceil((new Date(profile.race_date).getTime() - Date.now()) / 86_400_000))
    : null;
  const weeksToRace = daysToRace != null ? Math.ceil(daysToRace / 7) : null;

  const firstName = profile?.full_name?.split(" ")[0] || "corredor";

  if (overviewQ.isLoading) {
    return <div className="text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Bem-vindo,</p>
            <h1 className="text-3xl font-display font-bold truncate">{firstName}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {goal && (
                <Badge variant="secondary" className="gap-1">
                  <Trophy className="size-3" /> {DIST_LABEL[goal]} · Nível {level}
                </Badge>
              )}
              {weekDays.length > 0 && (
                <Badge variant="outline">{weekDays.length}x/semana</Badge>
              )}
            </div>
          </div>
          {profile?.race_date && (
            <div className="rounded-lg bg-card/80 border p-3 text-center min-w-[140px]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                <Calendar className="size-3" /> Sua prova
              </p>
              <p className="font-mono text-sm font-semibold mt-1">
                {new Date(profile.race_date).toLocaleDateString("pt-BR")}
              </p>
              {weeksToRace != null && (
                <p className="text-2xl font-display font-bold text-primary mt-1">
                  {weeksToRace}<span className="text-xs ml-1 text-muted-foreground">sem</span>
                </p>
              )}
              {daysToRace != null && (
                <p className="text-[10px] text-muted-foreground">{daysToRace} dias</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-3">
        {planUrl ? (
          <Button asChild size="lg" className="h-auto py-4">
            <Link to={planUrl}>
              <RouteIcon className="size-5" />
              <div className="text-left">
                <div className="font-semibold">Abrir minha planilha</div>
                <div className="text-xs opacity-80">{DIST_LABEL[goal!]} · Plano {phase}</div>
              </div>
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="outline" className="h-auto py-4">
            <Link to="/corredor/onboarding"><Trophy /> Gerar minha planilha</Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline" className="h-auto py-4">
          <Link to="/corredor/avaliacao">
            <Activity className="size-5" />
            <div className="text-left">
              <div className="font-semibold">Minha avaliação</div>
              <div className="text-xs opacity-80">
                {lastTest?.pace_seconds_per_km ? `FTP ${formatMmss(lastTest.pace_seconds_per_km)} min/km` : "Refazer teste"}
              </div>
            </div>
          </Link>
        </Button>
      </div>

      {/* Plan phases */}
      {planUrl && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><Layers className="size-5 text-primary" /> Seus 5 planos × 4 semanas</CardTitle>
              <CardDescription>20 semanas no total. Acesse o plano atual ou navegue entre eles.</CardDescription>
            </div>
            <Badge>Plano {phase} ativo</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-2">
              {[1, 2, 3, 4].map((p) => (
                <Link
                  key={p}
                  to={planUrl}
                  className={`rounded-lg border-2 p-3 text-center transition hover:border-primary/60 ${
                    p === phase ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-2xl font-display font-bold">{p}</p>
                  <p className="text-[10px] text-muted-foreground">4 semanas</p>
                </Link>
              ))}
              <Link
                to="/corredor/planilha/nova"
                className="rounded-lg border-2 border-dashed p-3 text-center transition hover:border-primary/60 flex flex-col items-center justify-center"
              >
                <RefreshCw className="size-5 text-muted-foreground mb-1" />
                <p className="text-xs font-medium">Nova planilha</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zones snapshot */}
      {lastTest && (lastTest.metadata as { zones?: Array<{ id: string; paceFastSec: number | null; paceSlowSec: number | null }> } | null)?.zones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="size-5 text-primary" /> Suas zonas de treino</CardTitle>
            <CardDescription>
              Baseado no seu último teste de {new Date(lastTest.test_date).toLocaleDateString("pt-BR")} ·
              FTP {lastTest.pace_seconds_per_km ? formatMmss(lastTest.pace_seconds_per_km) : "—"} min/km
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {((lastTest.metadata as { zones: Array<{ id: string; paceFastSec: number | null; paceSlowSec: number | null }> }).zones).map((z) => (
                <div key={z.id} className="rounded-md border p-2 text-xs">
                  <p className="font-bold">{z.id}</p>
                  <p className="font-mono">
                    {z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)} → {z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">"De" = pace mais rápido · "Até" = pace mais lento</p>
            <Button asChild variant="link" size="sm" className="mt-2 px-0">
              <Link to="/corredor/avaliacao">Ver detalhes <ChevronRight className="size-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="size-4" /> Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1.5">
          <p>· Sua planilha tem <strong>5 planos de 4 semanas</strong> (20 semanas no total).</p>
          <p>· Você pode <strong>arrastar treinos entre os dias</strong>, editar tudo livremente e exportar em PDF.</p>
          <p>· Quer mudar objetivo ou nível? Clique em <Link to="/corredor/planilha/nova" className="text-primary underline">Nova planilha</Link>.</p>
          <p>· Refaça o teste sempre que quiser atualizar suas zonas em <Link to="/corredor/avaliacao" className="text-primary underline">Minha avaliação</Link>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
