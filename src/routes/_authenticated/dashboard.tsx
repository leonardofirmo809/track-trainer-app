import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="size-11 rounded-xl bg-accent grid place-items-center"><Icon className="size-5 text-accent-foreground" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-display font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const isDev = import.meta.env.DEV;
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [s, t, p] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("tests").select("*", { count: "exact", head: true }),
        supabase.from("training_plans").select("*", { count: "exact", head: true }).eq("status", "ativa"),
      ]);
      return { students: s.count ?? 0, tests: t.count ?? 0, plans: p.count ?? 0 };
    },
  });

  const recent = useQuery({
    queryKey: ["recent-students"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, full_name, level, target_distance, created_at").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {isDev && (
        <div className="text-xs text-muted-foreground border rounded-md px-3 py-2 font-mono break-all">
          [dev] user.id: {user?.id ?? "—"} • role: {rolesLoading ? "carregando…" : isAdmin ? "admin ✓" : "não-admin"}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da sua operação</p>
        </div>
        <Button asChild><Link to="/alunos/novo">Novo aluno</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Alunos" value={stats.data?.students ?? "—"} />
        <StatCard icon={Timer} label="Testes registrados" value={stats.data?.tests ?? "—"} />
        <StatCard icon={ClipboardList} label="Planilhas ativas" value={stats.data?.plans ?? "—"} />
        <StatCard icon={TrendingUp} label="Sessões esta semana" value="—" />
      </div>

      <Card>
        <CardHeader><CardTitle>Alunos recentes</CardTitle></CardHeader>
        <CardContent>
          {recent.data && recent.data.length > 0 ? (
            <div className="divide-y">
              {recent.data.map((s) => (
                <Link key={s.id} to="/alunos/$studentId" params={{ studentId: s.id }} className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded">
                  <div>
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.level ?? "—"} • alvo {s.target_distance ?? "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum aluno cadastrado ainda. <Link to="/alunos/novo" className="text-primary font-medium hover:underline">Cadastrar primeiro aluno</Link></p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
