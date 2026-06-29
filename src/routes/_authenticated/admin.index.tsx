import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserPlus, ClipboardList, Activity, ChevronRight, Shield, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminOverview });

interface AuditRow {
  id: string;
  event_type: string;
  target_email: string | null;
  created_at: string;
}

const EVENT_LABEL: Record<string, string> = {
  invite_created: "Convite criado",
  invite_revoked: "Convite revogado",
  invite_resent: "Convite reenviado",
  invite_accepted: "Convite aceito",
  coach_created_manual: "Conta criada manualmente",
};

function AdminOverview() {
  const [stats, setStats] = useState({ coaches: 0, pendingInvites: 0, students: 0, tests: 0 });
  const [recent, setRecent] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [coaches, invites, students, tests, audit] = await Promise.all([
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "coach"),
          supabase.from("coach_invites").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("students").select("*", { count: "exact", head: true }),
          supabase.from("tests").select("*", { count: "exact", head: true }),
          supabase.from("admin_audit_log").select("id, event_type, target_email, created_at").order("created_at", { ascending: false }).limit(5),
        ]);
        const firstErr = coaches.error ?? invites.error ?? students.error ?? tests.error ?? audit.error;
        if (firstErr) {
          setError(`Erro ao carregar dados: ${firstErr.message}`);
          return;
        }
        setStats({
          coaches: coaches.count ?? 0,
          pendingInvites: invites.count ?? 0,
          students: students.count ?? 0,
          tests: tests.count ?? 0,
        });
        setRecent((audit.data ?? []) as AuditRow[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro inesperado ao carregar visão geral.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: "Treinadores ativos", value: stats.coaches, icon: Users },
    { label: "Convites pendentes", value: stats.pendingInvites, icon: UserPlus },
    { label: "Alunos cadastrados", value: stats.students, icon: ClipboardList },
    { label: "Testes registrados", value: stats.tests, icon: Activity },
  ];

  const shortcuts = [
    { to: "/admin/treinadores", title: "Treinadores", desc: "Convites e contas", icon: Users },
    { to: "/admin/alunos", title: "Alunos", desc: "Lista global", icon: ClipboardList },
    { to: "/admin/usuarios", title: "Usuários", desc: "Permissões e roles", icon: UserCog },
    { to: "/admin/auditoria", title: "Auditoria", desc: "Histórico de eventos", icon: Shield },
  ] as const;

  if (error) {
    return (
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-3xl font-display font-bold">Administração</h1>
          <p className="text-muted-foreground">Visão geral do sistema.</p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Administração</h1>
        <p className="text-muted-foreground">Visão geral do sistema.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold">{loading ? "—" : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card className="hover:border-primary/40 transition-colors h-full">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
                  <s.icon className="size-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos eventos</CardTitle>
          <CardDescription>Atividade administrativa recente</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : recent.length === 0 ? (
            <p className="text-muted-foreground">Nenhum evento ainda.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((e) => (
                <li key={e.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
                    {e.target_email && <span className="text-muted-foreground"> — {e.target_email}</span>}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs sm:text-sm">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
