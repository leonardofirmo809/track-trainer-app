import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, ClipboardList, User, Target, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuardRoles } from "@/lib/use-role";

const coachItems = [
  { title: "Home", url: "/dashboard", icon: Home, match: (p: string) => p === "/dashboard" },
  { title: "Alunos", url: "/alunos", icon: Users, match: (p: string) => p === "/alunos" || p.startsWith("/alunos/") },
  { title: "Planilhas", url: "/planilha-5km", icon: ClipboardList, match: (p: string) => p.startsWith("/planilha-") || p.startsWith("/teste-") },
  { title: "Conta", url: "/minha-conta", icon: User, match: (p: string) => p === "/minha-conta" },
];

const runnerItems = [
  { title: "Início", url: "/corredor", icon: Home, match: (p: string) => p === "/corredor" },
  { title: "Planilha", url: "/corredor/planilha", icon: ClipboardList, match: (p: string) => p === "/corredor/planilha" || p.startsWith("/planilha-") },
  { title: "Avaliação", url: "/corredor/avaliacao", icon: Target, match: (p: string) => p === "/corredor/avaliacao" },
  { title: "Nova", url: "/corredor/planilha/nova", icon: RefreshCw, match: (p: string) => p === "/corredor/planilha/nova" },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { isRunner } = useGuardRoles();
  const items = isRunner ? runnerItems : coachItems;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-card border-t border-border flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
      {items.map((i) => {
        const active = i.match(path);
        return (
          <Link
            key={i.url}
            to={i.url}
            className={cn(
              "flex-1 min-h-11 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <i.icon className="size-5" />
            <span>{i.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
