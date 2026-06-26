import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listCompanies,
  createCompany,
  updateCompany,
  listCompanyMembers,
  addCompanyMember,
  removeCompanyMember,
  updateCompanyMemberRole,
} from "@/lib/admin-companies.functions";
import { listAdminUsers } from "@/lib/admin-users.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Loader2, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/empresas")({
  component: AdminEmpresasPage,
});

type CompanyRole = "owner" | "admin" | "coach";
type CompanyStatus = "active" | "inactive";

interface Company {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: CompanyRole;
  created_at: string;
  email: string;
  full_name: string | null;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
}

const ROLE_LABEL: Record<CompanyRole, string> = {
  owner: "Proprietário",
  admin: "Admin",
  coach: "Coach",
};

function roleBadgeVariant(role: CompanyRole) {
  if (role === "owner") return "default" as const;
  if (role === "admin") return "secondary" as const;
  return "outline" as const;
}

function statusBadge(status: string) {
  return status === "active"
    ? <Badge>Ativa</Badge>
    : <Badge variant="outline">Inativa</Badge>;
}

function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet: company detail + members
  const [sheetCompany, setSheetCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // All system users (for add-member dropdown)
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);

  // Create company dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit company dialog
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [eName, setEName] = useState("");
  const [eSlug, setESlug] = useState("");
  const [eStatus, setEStatus] = useState<CompanyStatus>("active");
  const [editing, setEditing] = useState(false);

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [amUserId, setAmUserId] = useState("");
  const [amRole, setAmRole] = useState<CompanyRole>("coach");
  const [adding, setAdding] = useState(false);

  // Remove member confirmation
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  // Role change in-progress tracking
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  const listFn = useServerFn(listCompanies);
  const createFn = useServerFn(createCompany);
  const updateFn = useServerFn(updateCompany);
  const listMembersFn = useServerFn(listCompanyMembers);
  const addMemberFn = useServerFn(addCompanyMember);
  const removeMemberFn = useServerFn(removeCompanyMember);
  const updateRoleFn = useServerFn(updateCompanyMemberRole);
  const listUsersFn = useServerFn(listAdminUsers);

  const load = async () => {
    setLoading(true);
    try {
      const [companiesData, usersData] = await Promise.all([listFn(), listUsersFn()]);
      setCompanies((companiesData ?? []) as Company[]);
      setAllUsers(((usersData ?? []) as UserRow[]).sort((a, b) =>
        (a.email ?? "").localeCompare(b.email ?? ""),
      ));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (companyId: string) => {
    setMembersLoading(true);
    setMembers([]);
    try {
      const data = await listMembersFn({ data: { companyId } });
      setMembers((data ?? []) as Member[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar membros");
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openSheet = (company: Company) => {
    setSheetCompany(company);
    loadMembers(company.id);
  };

  // ── Create company ──────────────────────────────────────────────────────────

  const submitCreate = async () => {
    if (!cName.trim()) return toast.error("Informe o nome da empresa.");
    setCreating(true);
    try {
      await createFn({ data: { name: cName.trim(), slug: cSlug.trim() || undefined } });
      toast.success("Empresa criada com sucesso.");
      setCName(""); setCSlug(""); setCreateOpen(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // ── Edit company ────────────────────────────────────────────────────────────

  const openEdit = (company: Company) => {
    setEName(company.name);
    setESlug(company.slug ?? "");
    setEStatus(company.status === "active" ? "active" : "inactive");
    setEditTarget(company);
  };

  const submitEdit = async () => {
    if (!editTarget || !eName.trim()) return toast.error("Informe o nome da empresa.");
    setEditing(true);
    try {
      await updateFn({
        data: { id: editTarget.id, name: eName.trim(), slug: eSlug.trim() || undefined, status: eStatus },
      });
      toast.success("Empresa atualizada.");
      setEditTarget(null);
      await load();
      // Refresh sheet if open on this company
      if (sheetCompany?.id === editTarget.id) {
        setSheetCompany((prev) => prev ? { ...prev, name: eName.trim(), slug: eSlug.trim() || null, status: eStatus } : prev);
      }
    } catch (e: unknown) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setEditing(false);
    }
  };

  // ── Add member ──────────────────────────────────────────────────────────────

  const submitAddMember = async () => {
    if (!sheetCompany || !amUserId) return toast.error("Selecione um usuário.");
    setAdding(true);
    try {
      await addMemberFn({ data: { companyId: sheetCompany.id, userId: amUserId, role: amRole } });
      toast.success("Membro adicionado.");
      setAmUserId(""); setAmRole("coach"); setAddMemberOpen(false);
      await loadMembers(sheetCompany.id);
    } catch (e: unknown) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  // ── Remove member ───────────────────────────────────────────────────────────

  const confirmRemove = async () => {
    if (!sheetCompany || !removeTarget) return;
    setRemoving(true);
    try {
      await removeMemberFn({ data: { companyId: sheetCompany.id, userId: removeTarget.user_id } });
      toast.success("Membro removido.");
      setRemoveTarget(null);
      await loadMembers(sheetCompany.id);
    } catch (e: unknown) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setRemoving(false);
    }
  };

  // ── Update member role ──────────────────────────────────────────────────────

  const changeRole = async (member: Member, role: CompanyRole) => {
    if (!sheetCompany || role === member.role) return;
    setRoleChanging(member.user_id);
    try {
      await updateRoleFn({ data: { companyId: sheetCompany.id, userId: member.user_id, role } });
      toast.success("Papel atualizado.");
      await loadMembers(sheetCompany.id);
    } catch (e: unknown) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setRoleChanging(null);
    }
  };

  // ── Members not yet in the company (for add-member dropdown) ───────────────
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gerencie empresas e seus treinadores.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" /> Criar empresa
        </Button>
      </div>

      {/* Companies table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando…
            </div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="size-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">Nenhuma empresa cadastrada ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Crie a primeira empresa para começar.</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4 mr-2" /> Criar empresa
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {c.slug ?? "—"}
                      </TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => openSheet(c)} title="Membros">
                          <Users className="size-4 mr-1" /> Membros
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Company detail sheet ───────────────────────────────────────────── */}
      <Sheet open={!!sheetCompany} onOpenChange={(v) => !v && setSheetCompany(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Building2 className="size-5 shrink-0" />
              <span className="truncate">{sheetCompany?.name}</span>
              {sheetCompany && statusBadge(sheetCompany.status)}
            </SheetTitle>
          </SheetHeader>

          {sheetCompany && (
            <div className="mt-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => openEdit(sheetCompany)}>
                <Pencil className="size-3.5 mr-1" /> Editar empresa
              </Button>
            </div>
          )}

          <Separator className="my-4" />

          {/* Members section */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base">Membros ({members.length})</h3>
            <Button
              size="sm"
              onClick={() => { setAmUserId(""); setAmRole("coach"); setAddMemberOpen(true); }}
              disabled={availableUsers.length === 0}
              title={availableUsers.length === 0 ? "Todos os usuários já são membros" : undefined}
            >
              <UserPlus className="size-4 mr-1" /> Adicionar
            </Button>
          </div>

          {membersLoading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando membros…
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum membro nesta empresa ainda. Adicione um treinador para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isChanging = roleChanging === m.user_id;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{m.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </TableCell>
                      <TableCell>
                        {isChanging ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Select
                            value={m.role}
                            onValueChange={(v) => changeRole(m, v as CompanyRole)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">{ROLE_LABEL.owner}</SelectItem>
                              <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                              <SelectItem value="coach">{ROLE_LABEL.coach}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8"
                          onClick={() => setRemoveTarget(m)}
                          title="Remover membro"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create company dialog ──────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) { setCName(""); setCSlug(""); } setCreateOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar empresa</DialogTitle>
            <DialogDescription>Adicione uma nova empresa/assessoria ao sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Nome da empresa *</Label>
              <Input
                id="cname" value={cName} onChange={(e) => setCName(e.target.value)}
                placeholder="Ex.: Assessoria Correr Sempre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cslug">
                Slug <span className="text-muted-foreground font-normal text-xs">(opcional, identificador único)</span>
              </Label>
              <Input
                id="cslug" value={cSlug}
                onChange={(e) => setCSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="ex.: correr-sempre"
              />
              <p className="text-xs text-muted-foreground">Somente letras minúsculas, números e hífens.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCName(""); setCSlug(""); setCreateOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={creating}>
              {creating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
              {creating ? "Criando…" : "Criar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit company dialog ────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
            <DialogDescription>Editando <strong>{editTarget?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ename">Nome da empresa *</Label>
              <Input id="ename" value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eslug">
                Slug <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Input
                id="eslug" value={eSlug}
                onChange={(e) => setESlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="ex.: correr-sempre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estatus">Status</Label>
              <Select value={eStatus} onValueChange={(v) => setEStatus(v as CompanyStatus)}>
                <SelectTrigger id="estatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editing}>Cancelar</Button>
            <Button onClick={submitEdit} disabled={editing}>
              {editing ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              {editing ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add member dialog ──────────────────────────────────────────────── */}
      <Dialog open={addMemberOpen} onOpenChange={(v) => { if (!v) { setAmUserId(""); setAmRole("coach"); } setAddMemberOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
            <DialogDescription>
              Adicionar usuário à empresa <strong>{sheetCompany?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amuser">Usuário *</Label>
              <Select value={amUserId} onValueChange={setAmUserId}>
                <SelectTrigger id="amuser">
                  <SelectValue placeholder="Selecione um usuário…" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="font-medium">{u.full_name ?? u.email}</span>
                      {u.full_name && (
                        <span className="ml-2 text-muted-foreground text-xs">{u.email}</span>
                      )}
                    </SelectItem>
                  ))}
                  {availableUsers.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Todos os usuários já são membros.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amrole">Papel na empresa</Label>
              <Select value={amRole} onValueChange={(v) => setAmRole(v as CompanyRole)}>
                <SelectTrigger id="amrole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{ROLE_LABEL.owner}</SelectItem>
                  <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                  <SelectItem value="coach">{ROLE_LABEL.coach}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAmUserId(""); setAmRole("coach"); setAddMemberOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={submitAddMember} disabled={adding || !amUserId}>
              {adding ? <Loader2 className="size-4 mr-2 animate-spin" /> : <UserPlus className="size-4 mr-2" />}
              {adding ? "Adicionando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove member confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{removeTarget?.full_name ?? removeTarget?.email}</strong> de{" "}
              <strong>{sheetCompany?.name}</strong>? Os dados do usuário não serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemove}
              disabled={removing}
            >
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
