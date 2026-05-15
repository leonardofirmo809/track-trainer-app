import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  ClipboardList,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Circle,
  UserCog,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function todayPt() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;

  const profile = useQuery({
    queryKey: ["coach-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, specialty, bio")
        .eq("id", userId!)
        .maybeSingle();
      return data;
    },
  });

  const stats = useQuery({
    queryKey: ["dashboard-stats-v2", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [students, plans] = await Promise.all([
        supabase.from("students").select("id"),
        supabase.from("training_plans").select("student_id").eq("status", "ativa"),
      ]);
      const studentIds = (students.data ?? []).map((s) => s.id);
      const assignedSet = new Set((plans.data ?? []).map((p) => p.student_id));
      const assigned = studentIds.filter((id) => assignedSet.has(id)).length;
      return {
        total: studentIds.length,
        assigned,
        unassigned: Math.max(studentIds.length - assigned, 0),
      };
    },
  });

  const recent = useQuery({
    queryKey: ["recent-students-v2", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, level, target_distance, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const fullName = profile.data?.full_name || user?.email?.split("@")[0] || "Treinador";
  const firstName = fullName.split(" ")[0];
  const isEmpty = !stats.isLoading && (stats.data?.total ?? 0) === 0;
  const profileConfigured = !!(profile.data?.full_name && profile.data?.specialty);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">
          {greeting()}, {firstName} <span className="inline-block">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground capitalize mt-1">{todayPt()}</p>
      </div>

      {isEmpty ? (
        <EmptyState
          firstName={firstName}
          checklist={{
            profile: profileConfigured,
            student: false,
            plan: false,
          }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Métricas */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              <MetricCard
                icon={Users}
                label="Total de alunos"
                value={stats.data?.total ?? "—"}
                tone="primary"
              />
              <MetricCard
                icon={ClipboardCheck}
                label="Planilhas atribuídas"
                value={stats.data?.assigned ?? "—"}
                tone="success"
              />
              <MetricCard
                icon={AlertCircle}
                label="Sem planilha"
                value={stats.data?.unassigned ?? "—"}
                tone="warning"
                className="col-span-2 lg:col-span-1"
              />
            </div>

            {/* Alunos recentes */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Alunos recentes</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/alunos" className="text-primary">
                    Ver todos <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {recent.data && recent.data.length > 0 ? (
                  <ul className="divide-y">
                    {recent.data.map((s) => (
                      <li key={s.id}>
                        <Link
                          to="/alunos/$studentId"
                          params={{ studentId: s.id }}
                          className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-md hover:bg-muted/60 transition"
                        >
                          <Avatar className="size-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials(s.full_name) || "AL"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {s.level ?? "sem nível"}
                              {s.target_distance ? ` • ${s.target_distance}` : ""}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                            {new Date(s.created_at).toLocaleDateString("pt-BR")}
                          </span>
                          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhum aluno cadastrado ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            {/* Acesso rápido */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acesso rápido</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <QuickAction to="/alunos/novo" icon={UserPlus} label="Novo aluno" primary />
                <QuickAction to="/planilha-10km" icon={ClipboardList} label="Ver planilhas" />
                <QuickAction to="/minha-marca" icon={UserCog} label="Editar perfil" />
              </CardContent>
            </Card>

            {/* Perfil */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seu perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="size-14">
                    {profile.data?.avatar_url ? (
                      <AvatarImage src={profile.data.avatar_url} alt={fullName} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initials(fullName) || "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.data?.specialty || "Adicione sua especialidade"}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full mt-4">
                  <Link to="/minha-marca">Editar perfil</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: "primary" | "success" | "warning";
  className?: string;
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  }[tone];
  return (
    <Card className={className}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`size-11 rounded-xl grid place-items-center shrink-0 ${toneClasses}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <p className="text-2xl font-display font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  primary,
}: {
  to: "/alunos/novo" | "/planilha-10km" | "/minha-marca";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
}) {
  return (
    <Button
      asChild
      variant={primary ? "default" : "outline"}
      className="w-full justify-start min-h-12 text-base"
    >
      <Link to={to}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  );
}

function EmptyState({
  firstName,
  checklist,
}: {
  firstName: string;
  checklist: { profile: boolean; student: boolean; plan: boolean };
}) {
  const items: { done: boolean; label: string }[] = [
    { done: checklist.profile, label: "Perfil configurado" },
    { done: checklist.student, label: "Adicionar primeiro aluno" },
    { done: checklist.plan, label: "Atribuir primeira planilha" },
  ];
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-6 md:p-10 max-w-2xl mx-auto text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto">
            <UserPlus className="size-7" />
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            Bem-vindo(a), {firstName}!
          </h2>
          <p className="text-muted-foreground">
            Vamos preparar sua assessoria em 3 passos rápidos.
          </p>
        </div>

        <ul className="text-left space-y-3 max-w-sm mx-auto">
          {items.map((it) => (
            <li
              key={it.label}
              className="flex items-center gap-3 rounded-md border bg-background px-3 py-2.5"
            >
              {it.done ? (
                <CheckCircle2 className="size-5 text-primary shrink-0" />
              ) : (
                <Circle className="size-5 text-muted-foreground shrink-0" />
              )}
              <span className={it.done ? "text-muted-foreground line-through" : "font-medium"}>
                {it.label}
              </span>
            </li>
          ))}
        </ul>

        <Button asChild size="lg" className="w-full sm:w-auto min-h-12 px-8">
          <Link to="/alunos/novo">
            <UserPlus className="size-5" />
            Adicionar meu primeiro aluno
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
