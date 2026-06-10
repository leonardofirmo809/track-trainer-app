import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Calendar, Route as RouteIcon, RefreshCw, FileText } from "lucide-react";
import { getRunnerOverview } from "@/lib/runner.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/corredor/")({ component: RunnerHome });

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

  const daysToRace = profile?.race_date ? Math.max(0, Math.ceil((new Date(profile.race_date).getTime() - Date.now()) / 86_400_000)) : null;
  const weeksToRace = daysToRace != null ? Math.ceil(daysToRace / 7) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Olá, {profile?.full_name?.split(" ")[0] || "corredor"}!</h1>
        <p className="text-muted-foreground">Sua área pessoal de treinos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" /> Seu objetivo</CardTitle>
          <CardDescription>
            {goal ? `${goal.toUpperCase()} · Nível ${profile?.goal_level ?? "—"}` : "Sem planilha gerada ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.race_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              <span>Prova em <strong>{new Date(profile.race_date).toLocaleDateString("pt-BR")}</strong></span>
              {weeksToRace != null && <span className="text-muted-foreground">· faltam {weeksToRace} semana{weeksToRace === 1 ? "" : "s"}</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {planUrl && (
              <Button asChild>
                <Link to={planUrl}><RouteIcon /> Abrir minha planilha</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/teste-3km"><FileText /> Refazer avaliação</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/corredor/onboarding"><RefreshCw /> Nova planilha</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>· Sua planilha tem 5 Planos de 4 semanas cada (20 semanas no total).</p>
          <p>· Você pode arrastar os treinos entre os dias, editar livremente e exportar em PDF.</p>
          <p>· Para gerar uma nova planilha (mudar objetivo ou nível), clique em "Nova planilha".</p>
        </CardContent>
      </Card>
    </div>
  );
}
