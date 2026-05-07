import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useRoles } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

function AdminLayout() {
  const { isAdmin, loading } = useRoles();
  if (loading) return <div className="text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return <Outlet />;
}
