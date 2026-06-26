import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, Users, Timer, Route as RouteIcon, LogOut, Shield, ClipboardList, ScrollText, Palette, Settings, Target, RefreshCw, BookOpen, UserCog } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useRoles } from "@/lib/use-role";
import { Button } from "./ui/button";

const mainCoach = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", url: "/alunos", icon: Users },
  { title: "Minha marca", url: "/minha-marca", icon: Palette },
];
const mainRunner = [
  { title: "Visão geral", url: "/corredor", icon: LayoutDashboard },
  { title: "Minha planilha", url: "/corredor/planilha", icon: BookOpen },
  { title: "Minha avaliação", url: "/corredor/avaliacao", icon: Target },
  { title: "Nova planilha", url: "/corredor/planilha/nova", icon: RefreshCw },
];
const planosCoach = [
  { title: "Teste de 3KM", url: "/teste-3km", icon: Timer },
  { title: "Planilha 5KM", url: "/planilha-5km", icon: RouteIcon },
  { title: "Planilha 10KM", url: "/planilha-10km", icon: RouteIcon },
  { title: "Planilha 21KM", url: "/planilha-21km", icon: RouteIcon },
  { title: "Planilha 42KM", url: "/planilha-42km", icon: RouteIcon },
];

const activeCls =
  "data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:rounded-l-none";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const { isAdmin, isRunner } = useRoles();
  const isActive = (u: string) => path === u || path.startsWith(u + "/");
  const initials = (user?.user_metadata?.full_name || user?.email || "?").slice(0, 2).toUpperCase();
  const main = isRunner ? mainRunner : mainCoach;
  const planos = isRunner ? [] : planosCoach;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1">
          <BrandLogo size={32} />
          {!collapsed && (
            <span className="font-display text-lg font-bold tracking-tight">
              <span>8020</span><span className="text-[oklch(0.78_0.18_45)]"> Pace</span>
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} tooltip={i.title} className={activeCls}>
                    <Link to={i.url}><i.icon /><span>{i.title}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {planos.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Prescrição</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {planos.map((i) => (
                  <SidebarMenuItem key={i.url}>
                    <SidebarMenuButton asChild isActive={isActive(i.url)} tooltip={i.title} className={activeCls}>
                      <Link to={i.url}><i.icon /><span>{i.title}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/admin"} tooltip="Visão geral" className={activeCls}>
                    <Link to="/admin"><Shield /><span>Visão geral</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/treinadores")} tooltip="Treinadores" className={activeCls}>
                    <Link to="/admin/treinadores"><Users /><span>Treinadores</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/alunos")} tooltip="Alunos" className={activeCls}>
                    <Link to="/admin/alunos"><ClipboardList /><span>Alunos</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/auditoria")} tooltip="Auditoria" className={activeCls}>
                    <Link to="/admin/auditoria"><ScrollText /><span>Auditoria</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/usuarios")} tooltip="Usuários" className={activeCls}>
                    <Link to="/admin/usuarios"><UserCog /><span>Usuários</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/configuracoes")} tooltip="Configurações" className={activeCls}>
                    <Link to="/admin/configuracoes"><Settings /><span>Configurações</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <Link
            to="/minha-conta"
            title="Minha conta"
            className="flex items-center gap-2 flex-1 min-w-0 rounded hover:bg-accent transition-colors"
          >
            <Avatar className="size-8 shrink-0"><AvatarFallback>{initials}</AvatarFallback></Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "Professor"}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
              </div>
            )}
          </Link>
          <Button size="icon" variant="ghost" onClick={() => signOut()} title="Sair" className="shrink-0">
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
