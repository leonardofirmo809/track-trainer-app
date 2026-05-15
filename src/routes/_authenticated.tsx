import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Menu } from "lucide-react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setSidebarOpen(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    let cancelled = false;
    setProfileLoading(true);
    (async () => {
      const [{ data: profile }, { data: roleRow }] = await Promise.all([
        supabase.from("profiles").select("onboarding_completed, full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      ]);
      if (cancelled) return;
      const isAdmin = !!roleRow;
      const incomplete = !profile?.onboarding_completed || !profile?.full_name;
      setNeedsOnboarding(!isAdmin && incomplete);
      setProfileLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/login" />;
  if (profileLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (needsOnboarding && location.pathname !== "/onboarding") return <Navigate to="/onboarding" />;

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{ "--sidebar-width": "240px", "--sidebar-width-icon": "64px" } as React.CSSProperties}
    >
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b bg-card px-4 sticky top-0 z-30">
            <SidebarTrigger className="hidden md:inline-flex" />
            <div className="flex items-center gap-2 md:hidden">
              <div className="size-8 rounded-lg bg-primary grid place-items-center">
                <Activity className="size-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">PaceLab</span>
            </div>
            <div className="flex-1" />
            <MobileMenuButton />
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}

function MobileMenuButton() {
  const { setOpenMobile } = useSidebar();
  return (
    <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu" onClick={() => setOpenMobile(true)}>
      <Menu />
    </Button>
  );
}
