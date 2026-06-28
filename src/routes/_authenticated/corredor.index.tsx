import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, RefreshCw, Trophy, ChevronRight, Layers, Target, Coffee, ArrowRight,
} from "lucide-react";
import { getRunnerOverview } from "@/lib/runner.functions";
import { useAuth } from "@/lib/auth-context";
import { formatMmss } from "@/lib/teste-3km";
import { buildRunnerToday } from "@/lib/runner-today";
import {
  DAY_LABELS, INTENSITY_CONFIG, SESSION_TYPE_LABELS, formatDistance, formatDuration,
} from "@/lib/training-session-types";
import { cn } from "@/lib/utils";

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

  const [showAllPlans, setShowAllPlans] = useState(false);

  useEffect(() => {
    if (overviewQ.data && !overviewQ.data.profile?.runner_onboarding_completed) {
      navigate({ to: "/corredor/onboarding" });
    }
  }, [overviewQ.data, navigate]);

  if (overviewQ.isLoading) return <div className="text-muted-foreground">Carregando…</div>;

  const profile = overviewQ.data?.profile;
  const goal = profile?.goal_distance as "10km" | "21km" | "42km" | null | undefined;
  const planUrl = goal ? `/planilha-${goal}` : null;
  const activePlan = overviewQ.data?.activePlan;
  const lastTest = overviewQ.data?.lastTest;
  const level = ((activePlan?.payload as { level?: number } | null)?.level) ?? profile?.goal_level ?? 1;

  const today = activePlan
    ? buildRunnerToday(activePlan.payload, activePlan.start_date, activePlan.created_at)
    : null;

  const daysToRace = profile?.race_date
    ? Math.max(0, Math.ceil((new Date(profile.race_date).getTime() - Date.now()) / 86_400_000))
    : null;
  const weeksToRace = daysToRace != null ? Math.ceil(daysToRace / 7) : null;
  const firstName = profile?.full_name?.split(" ")[0] || "corredor";

  const zones = (lastTest?.metadata as { zones?: Array<{ id: string; paceFastSec: number | null; paceSlowSec: number | null }> } | null)?.zones;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Compact header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold truncate">Olá, {firstName}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {goal && (
              <Badge variant="secondary" className="gap-1">
                <Trophy className="size-3" /> {DIST_LABEL[goal]} · Nível {level}
              </Badge>
            )}
            {weeksToRace != null && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="size-3" /> {weeksToRace} sem · {daysToRace}d para a prova
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* HERO: Treino de hoje */}
      {!today?.hasPlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Você ainda não tem planilha</CardTitle>
            <CardDescription>Gere sua planilha personalizada em poucos minutos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg"><Link to="/corredor/onboarding"><Trophy /> Gerar minha planilha</Link></Button>
          </CardContent>
        </Card>
      ) : today.todaySession ? (
        <TodayCard session={today.todaySession} date={today.todayDate} planUrl={planUrl!} zones={zones} />
      ) : (
        <RestDayCard date={today.todayDate} planUrl={planUrl!} />
      )}

      {/* Esta semana */}
      {today?.hasPlan && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Esta semana</CardTitle>
              <span className="text-xs text-muted-foreground">
                Plano {today.phase} · Semana {today.weekNumber} de 4
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {today.weekChips.map((c) => (
                <Link
                  key={c.dayKey}
                  to={planUrl!}
                  className={cn(
                    "rounded-md border p-1 sm:p-2 text-center transition hover:border-primary/60 min-h-[52px] sm:min-h-[64px] flex flex-col justify-between",
                    c.isToday && "border-primary bg-primary/5",
                    c.isPast && !c.isToday && "opacity-50",
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {DAY_LABELS[c.dayKey]}
                  </div>
                  <div className="text-sm font-mono font-semibold">
                    {c.session?.code ?? "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.date.getDate().toString().padStart(2, "0")}/{(c.date.getMonth() + 1).toString().padStart(2, "0")}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximo treino */}
      {today?.nextSession && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <ArrowRight className="size-4 shrink-0" />
          <span>
            <strong className="text-foreground">Próximo:</strong>{" "}
            {DAY_LABELS[today.nextSession.dayKey]} ·{" "}
            {today.nextSession.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ·{" "}
            {today.nextSession.session.name}
          </span>
        </div>
      )}

      {/* Cards secundários */}
      {today?.hasPlan && (
        <div className="grid md:grid-cols-2 gap-3">
          {/* Plano atual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Plano atual
              </CardTitle>
              <CardDescription>Plano {today.phase} de 4 · Semana {today.weekNumber} de 4</CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => setShowAllPlans((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {showAllPlans ? "Esconder" : "Ver os 4 planos"}
              </button>
              {showAllPlans && (
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {[1, 2, 3, 4].map((p) => (
                    <Link
                      key={p}
                      to={planUrl!}
                      className={cn(
                        "rounded-md border p-2 text-center",
                        p === today.phase ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <p className="text-[10px] text-muted-foreground">Plano</p>
                      <p className="text-lg font-display font-bold">{p}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zonas */}
          {zones && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="size-4 text-primary" /> Suas zonas
                </CardTitle>
                <CardDescription>
                  FTP {lastTest?.pace_seconds_per_km ? formatMmss(lastTest.pace_seconds_per_km) : "—"} min/km
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {zones.map((z) => (
                    <div key={z.id} className="rounded-md border px-2 py-1 text-[11px] font-mono">
                      <span className="font-bold">{z.id}</span>{" "}
                      {z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)}→{z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)}
                    </div>
                  ))}
                </div>
                <Button asChild variant="link" size="sm" className="mt-2 px-0 h-auto">
                  <Link to="/corredor/avaliacao">Ver detalhes <ChevronRight className="size-3" /></Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rodapé discreto */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
        <Link to="/corredor/avaliacao" className="hover:text-foreground hover:underline">Refazer avaliação</Link>
        <span>·</span>
        <Link to="/corredor/planilha/nova" className="hover:text-foreground hover:underline inline-flex items-center gap-1">
          <RefreshCw className="size-3" /> Nova planilha
        </Link>
      </div>
    </div>
  );
}

function TodayCard({
  session, date, planUrl, zones,
}: {
  session: import("@/lib/training-session-types").TrainingSession;
  date: Date;
  planUrl: string;
  zones?: Array<{ id: string; paceFastSec: number | null; paceSlowSec: number | null }>;
}) {
  const intensity = INTENSITY_CONFIG[session.intensity];
  const dominantZone = (Object.entries(session.zones) as [string, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const targetZone = dominantZone && zones?.find((z) => z.id === dominantZone);

  const dayLabel = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });

  return (
    <Card className={cn("overflow-hidden", intensity.cardClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Treino de hoje · {dayLabel}</p>
            <CardTitle className="text-xl sm:text-2xl mt-1">{session.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {SESSION_TYPE_LABELS[session.type]} · <span className="font-mono">{session.code}</span>
            </p>
          </div>
          <Badge className={intensity.badgeClass}>{intensity.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Duração" value={formatDuration(session.duration)} />
          <Stat label="Distância" value={formatDistance(session.distance)} />
          <Stat
            label={dominantZone ? `Pace ${dominantZone}` : "Pace"}
            value={targetZone
              ? `${targetZone.paceFastSec == null ? "Máx" : formatMmss(targetZone.paceFastSec)}–${targetZone.paceSlowSec == null ? "Máx" : formatMmss(targetZone.paceSlowSec)}`
              : "—"}
          />
        </div>

        {session.structure.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Estrutura</p>
            <ul className="space-y-1">
              {session.structure.map((b) => (
                <li key={b.id} className="flex items-start gap-2 text-sm">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground mt-0.5 w-12 shrink-0">{b.zone}</span>
                  <span className="min-w-0"><strong>{b.label}:</strong> {b.content}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {session.description && session.structure.length === 0 && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}

        <Button asChild size="lg" className="w-full">
          <Link to={planUrl}>Ver detalhes na planilha <ChevronRight className="size-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function RestDayCard({ date, planUrl }: { date: Date; planUrl: string }) {
  const dayLabel = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{dayLabel}</p>
        <CardTitle className="flex items-center gap-2"><Coffee className="size-5 text-primary" /> Dia de descanso</CardTitle>
        <CardDescription>
          Aproveite para alongar, fazer mobilidade leve ou caminhar. Recuperação faz parte do treino.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link to={planUrl}>Ver semana completa <ChevronRight className="size-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold mt-0.5 truncate">{value}</p>
    </div>
  );
}
