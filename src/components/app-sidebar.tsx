import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, Users, Timer, Route as RouteIcon, LogOut, Shield, ClipboardList, ScrollText } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useRoles } from "@/lib/use-role";
import { Button } from "./ui/button";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", url: "/alunos", icon: Users },
];
const planos = [
  { title: "Teste de 3KM", url: "/teste-3km", icon: Timer },
  { title: "Planilha 5KM", url: "/planilha-5km", icon: RouteIcon },
  { title: "Planilha 10KM", url: "/planilha-10km", icon: RouteIcon },
  { title: "Planilha 21KM", url: "/planilha-21km", icon: RouteIcon },
  { title: "Planilha 42KM", url: "/planilha-42km", icon: RouteIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const isDev = import.meta.env.DEV;
  const isActive = (u: string) => path === u || path.startsWith(u + "/");
  const initials = (user?.user_metadata?.full_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="size-8 rounded-lg bg-primary grid place-items-center shrink-0">
            <Activity className="size-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-display text-lg font-bold">PaceLab</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url}><i.icon /><span>{i.title}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Prescrição</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planos.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url}><i.icon /><span>{i.title}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/admin"}>
                    <Link to="/admin"><Shield /><span>Visão geral</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/treinadores")}>
                    <Link to="/admin/treinadores"><Users /><span>Treinadores</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/alunos")}>
                    <Link to="/admin/alunos"><ClipboardList /><span>Alunos</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/auditoria")}>
                    <Link to="/admin/auditoria"><ScrollText /><span>Auditoria</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "Professor"}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <Button size="icon" variant="ghost" onClick={() => signOut()} title="Sair">
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
