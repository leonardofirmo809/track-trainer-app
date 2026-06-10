import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRunnerOverview } from "@/lib/runner.functions";

export const Route = createFileRoute("/_authenticated/corredor/planilha/")({
  component: RunnerPlanRedirect,
});

function RunnerPlanRedirect() {
  const fetchOverview = useServerFn(getRunnerOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["runner-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  const goal = String(data?.profile?.goal_distance ?? 10);
  const path = goal === "5" ? "/planilha-5km"
    : goal === "21" ? "/planilha-21km"
    : goal === "42" ? "/planilha-42km"
    : "/planilha-10km";
  return <Navigate to={path} />;
}
