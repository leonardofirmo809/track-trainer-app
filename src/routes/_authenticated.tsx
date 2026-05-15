import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b bg-card px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
