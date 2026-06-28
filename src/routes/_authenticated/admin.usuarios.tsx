import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { listAdminUsers, updateUserRoles } from "@/lib/admin-users.functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({ component: AdminUsuariosPage });

type AppRole = "admin" | "coach" | "runner";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  created_at: string;
}

const ALL_ROLES: AppRole[] = ["admin", "coach", "runner"];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  coach: "Coach",
  runner: "Runner",
};

function roleBadgeClass(role: AppRole, active: boolean): string {
  if (!active) return "opacity-25 border-dashed cursor-pointer hover:opacity-50 transition-opacity";
  const base = "cursor-pointer hover:opacity-75 transition-opacity ";
  if (role === "admin") return base + "bg-primary text-primary-foreground";
  if (role === "coach") return base + "bg-secondary text-secondary-foreground";
  return base + "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200";
}

function AdminUsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [pendingOp, setPendingOp] = useState<{ userId: string; role: AppRole } | null>(null);

  const listFn = useServerFn(listAdminUsers);
  const updateFn = useServerFn(updateUserRoles);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFn();
      setUsers((data ?? []) as UserRow[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyUpdate = async (targetUserId: string, role: AppRole, action: "add" | "remove") => {
    setSaving(targetUserId);
    try {
      await updateFn({ data: { targetUserId, role, action } });
      toast.success(action === "add" ? `Role ${ROLE_LABEL[role]} adicionada.` : `Role ${ROLE_LABEL[role]} removida.`);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Erro ao atualizar permissão");
    } finally {
      setSaving(null);
      setPendingOp(null);
    }
  };

  const toggle = (targetUserId: string, role: AppRole, hasRole: boolean) => {
    if (saving) return;
    if (!hasRole) {
      applyUpdate(targetUserId, role, "add");
    } else if (role === "admin") {
      setPendingOp({ userId: targetUserId, role });
    } else {
      applyUpdate(targetUserId, role, "remove");
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-3xl font-display font-bold">Usuários e Permissões</h1>
          <p className="text-muted-foreground">Gerencie roles de todos os usuários do sistema.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Usuários cadastrados
            </CardTitle>
            <CardDescription>
              Clique em uma role para adicioná-la (opaca = inativa) ou removê-la. A remoção de Admin exige
              confirmação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Carregando…
              </div>
            ) : users.length === 0 ? (
              <p className="py-6 text-muted-foreground">Nenhum usuário encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const isSelf = u.id === user?.id;
                      const isBusy = saving === u.id;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {u.full_name ?? "—"}
                            {isSelf && (
                              <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-xs text-muted-foreground cursor-default">
                                  {u.id.slice(0, 8)}…
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono text-xs select-all">{u.id}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {isBusy && <Loader2 className="size-4 animate-spin self-center text-muted-foreground" />}
                              {ALL_ROLES.map((role) => {
                                const hasRole = u.roles.includes(role);
                                const isOwnAdmin = isSelf && role === "admin";
                                return (
                                  <Tooltip key={role}>
                                    <TooltipTrigger asChild>
                                      <button
                                        disabled={isBusy || isOwnAdmin}
                                        onClick={() => toggle(u.id, role, hasRole)}
                                        className="focus:outline-none disabled:pointer-events-none"
                                        aria-label={`${hasRole ? "Remover" : "Adicionar"} role ${ROLE_LABEL[role]}`}
                                      >
                                        <Badge
                                          variant="outline"
                                          className={roleBadgeClass(role, hasRole)}
                                        >
                                          {ROLE_LABEL[role]}
                                        </Badge>
                                      </button>
                                    </TooltipTrigger>
                                    {isOwnAdmin && (
                                      <TooltipContent>
                                        Você não pode remover seu próprio acesso de administrador
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!pendingOp} onOpenChange={(open) => !open && setPendingOp(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover acesso de administrador</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a role <strong>Admin</strong> deste usuário? Ele perderá acesso a
                todas as funções administrativas imediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingOp(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => pendingOp && applyUpdate(pendingOp.userId, pendingOp.role, "remove")}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
