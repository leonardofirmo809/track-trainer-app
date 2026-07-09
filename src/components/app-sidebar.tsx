import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, Users, Timer, Route as RouteIcon, LogOut, Shield, ClipboardList, ScrollText, Palette, Settings, Target, RefreshCw, BookOpen, UserCog, Building2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useGuardRoles } from "@/lib/use-role";
import { Button } from "./ui/button";

const mainCoach = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/") },
  { title: "Alunos", url: "/alunos", icon: Users, match: (p: string) => p === "/alunos" || p.startsWith("/alunos/") },
  { title: "Minha marca", url: "/minha-marca", icon: Palette, match: (p: string) => p === "/minha-marca" || p.startsWith("/minha-marca/") },
];
const mainRunner = [
  { title: "Visão geral", url: "/corredor", icon: LayoutDashboard, match: (p: string) => p === "/corredor" },
  { title: "Minha planilha", url: "/corredor/planilha", icon: BookOpen, match: (p: string) => p === "/corredor/planilha" },
  { title: "Minha avaliação", url: "/corredor/avaliacao", icon: Target, match: (p: string) => p === "/corredor/avaliacao" },
  { title: "Nova planilha", url: "/corredor/planilha/nova", icon: RefreshCw, match: (p: string) => p === "/corredor/planilha/nova" },
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
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const { isAdmin, isCoach, isRunner } = useGuardRoles();
  const isPureRunner = isRunner && !isAdmin && !isCoach;
  const isActive = (item: { url: string; match?: (p: string) => boolean }) =>
    item.match ? item.match(path) : path === item.url || path.startsWith(item.url + "/");
  const initials = (user?.user_metadata?.full_name || user?.email || "?").slice(0, 2).toUpperCase();
  const main = isPureRunner ? mainRunner : mainCoach;
  const planos = isPureRunner ? [] : planosCoach;

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
                  <SidebarMenuButton asChild isActive={isActive(i)} tooltip={i.title} className={activeCls}>
                    <Link to={i.url} onClick={closeOnMobile}><i.icon /><span>{i.title}</span></Link>
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
                    <SidebarMenuButton asChild isActive={isActive(i)} tooltip={i.title} className={activeCls}>
                      <Link to={i.url} onClick={closeOnMobile}><i.icon /><span>{i.title}</span></Link>
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
                    <Link to="/admin" onClick={closeOnMobile}><Shield /><span>Visão geral</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive({ url: "/admin/treinadores" })} tooltip="Treinadores" className={activeCls}>
                    <Link to="/admin/treinadores" onClick={closeOnMobile}><Users /><span>Treinadores</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive({ url: "/admin/alunos" })} tooltip="Alunos" className={activeCls}>
                    <Link to="/admin/alunos" onClick={closeOnMobile}><ClipboardList /><span>Alunos</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive({ url: "/admin/auditoria" })} tooltip="Auditoria" className={activeCls}>
                    <Link to="/admin/auditoria" onClick={closeOnMobile}><ScrollText /><span>Auditoria</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive({ url: "/admin/usuarios" })} tooltip="Usuários" className={activeCls}>
                    <Link to="/admin/usuarios" onClick={closeOnMobile}><UserCog /><span>Usuários</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive({ url: "/admin/empresas" })} tooltip="Empresas" className={activeCls}>
                    <Link to="/admin/empresas" onClick={closeOnMobile}><Building2 /><span>Empresas</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive({ url: "/admin/configuracoes" })} tooltip="Configurações" className={activeCls}>
                    <Link to="/admin/configuracoes" onClick={closeOnMobile}><Settings /><span>Configurações</span></Link>
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
            onClick={closeOnMobile}
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
