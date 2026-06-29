import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useRoles } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

function AdminLayout() {
  const { isAdmin, loading } = useRoles();
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <AccessDenied />;
  return <Outlet />;
}

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto size-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <Shield className="size-7 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground">
          Esta área requer o papel de <strong>administrador global</strong>{" "}
          (<code>user_roles.role = 'admin'</code>).
        </p>
        <p className="text-sm text-muted-foreground">
          O papel de administrador de empresa (<em>company_members.role = 'admin'</em>) não concede acesso ao painel global.
          Peça a um administrador global que atribua o papel correto em{" "}
          <strong>/admin/usuarios</strong>.
        </p>
      </div>
    </div>
  );
}
