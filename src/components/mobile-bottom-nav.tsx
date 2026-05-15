import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Alunos", url: "/alunos", icon: Users },
  { title: "Planilhas", url: "/planilha-5km", icon: ClipboardList },
  { title: "Perfil", url: "/minha-marca", icon: User },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (u: string) => {
    if (u === "/planilha-5km") return path.startsWith("/planilha-") || path.startsWith("/teste-");
    return path === u || path.startsWith(u + "/");
  };
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-card border-t border-border flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
      {items.map((i) => {
        const active = isActive(i.url);
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
