import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, History, Target, RefreshCw, Home, ChevronRight, AlertTriangle } from "lucide-react";
import { getRunnerOverview, getRunnerTestsHistory } from "@/lib/runner.functions";
import { useAuth } from "@/lib/auth-context";
import { formatMmss } from "@/lib/teste-3km";

export const Route = createFileRoute("/_authenticated/corredor/avaliacao")({ component: AvaliacaoPage });

const TEST_LABEL: Record<string, string> = { "3km": "Teste 3km", "5km": "Prova 5km", "10km": "Prova 10km", "outro": "Outro" };

function AvaliacaoPage() {
  const { user } = useAuth();
  const overviewFn = useServerFn(getRunnerOverview);
  const historyFn = useServerFn(getRunnerTestsHistory);

  const overviewQ = useQuery({
    queryKey: ["runner-overview", user?.id],
    queryFn: () => overviewFn(),
    enabled: !!user,
  });
  const historyQ = useQuery({
    queryKey: ["runner-tests-history", user?.id],
    queryFn: () => historyFn(),
    enabled: !!user,
  });

  const lastTest = overviewQ.data?.lastTest;
  const zones = (lastTest?.metadata as { zones?: Array<{ id: string; level: string; phrase: string; paceFastSec: number | null; paceSlowSec: number | null; velFrom: number; velTo: number | null }> } | null)?.zones;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/corredor" className="flex items-center gap-1 hover:text-foreground"><Home className="size-3.5" /> Visão geral</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Minha avaliação</span>
      </nav>

      <div>
        <h1 className="text-3xl font-display font-bold">Minha avaliação</h1>
        <p className="text-muted-foreground">Suas zonas de treino atuais e histórico de testes.</p>
      </div>

      {!lastTest && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <AlertTriangle className="size-8 text-amber-500 mx-auto" />
            <p className="text-muted-foreground">Você ainda não tem nenhuma avaliação registrada.</p>
            <Button asChild>
              <Link to="/corredor/onboarding">Fazer avaliação</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {lastTest && (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2"><Target className="size-5 text-primary" /> Zonas atuais</CardTitle>
              <CardDescription>
                {TEST_LABEL[lastTest.test_type] ?? lastTest.test_type} feito em {new Date(lastTest.test_date).toLocaleDateString("pt-BR")}
              </CardDescription>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs uppercase text-muted-foreground">FTP</p>
              <p className="font-mono text-2xl font-bold">
                {lastTest.pace_seconds_per_km ? formatMmss(lastTest.pace_seconds_per_km) : "—"}
                <span className="text-xs font-normal text-muted-foreground"> min/km</span>
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {zones && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {zones.map((z) => (
                  <div key={z.id} className="rounded-md border p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{z.id}</p>
                      <Badge variant="outline" className="text-[10px]">{z.level}</Badge>
                    </div>
                    <p className="font-mono">
                      {z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)} → {z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)}
                    </p>
                    <p className="font-mono text-muted-foreground">
                      {z.velTo == null ? "Máx" : z.velTo.toFixed(1)} → {z.velFrom.toFixed(1)} km/h
                    </p>
                    <p className="text-[10px] text-muted-foreground italic">"{z.phrase}"</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              <strong>"De"</strong> = pace mais rápido · <strong>"Até"</strong> = pace mais lento
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2"><History className="size-5 text-muted-foreground" /> Histórico de testes</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/corredor/planilha/nova"><RefreshCw /> Refazer teste</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {historyQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !historyQ.data?.tests.length ? (
            <p className="text-sm text-muted-foreground">Nenhum teste registrado ainda.</p>
          ) : (
            <ul className="divide-y">
              {historyQ.data.tests.map((t) => (
                <li key={t.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {TEST_LABEL[t.test_type] ?? t.test_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.test_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-semibold shrink-0">
                    {t.pace_seconds_per_km ? `${formatMmss(t.pace_seconds_per_km)} /km` : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Para aplicar um novo teste à sua planilha, gere uma <Link to="/corredor/planilha/nova" className="text-primary underline">nova planilha</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
