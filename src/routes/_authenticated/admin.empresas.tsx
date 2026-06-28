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
  updateCompanyMemberPermissions,
} from "@/lib/admin-companies.functions";
import {
  listCompanyStudents,
  listStudentsWithoutCompany,
  addStudentToCompany,
  removeStudentFromCompany,
} from "@/lib/admin-company-students.functions";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Building2, Loader2, Pencil, Plus, Trash2, UserPlus, Users, GraduationCap,
} from "lucide-react";

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
  can_manage_students: boolean;
  can_manage_training: boolean;
  created_at: string;
  email: string;
  full_name: string | null;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
}

interface CompanyStudent {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  coach_id: string | null;
  coach_name: string | null;
  created_at: string;
}

interface UnassignedStudent {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

const ROLE_LABEL: Record<CompanyRole, string> = {
  owner: "Proprietário",
  admin: "Admin",
  coach: "Coach",
};

function statusBadge(status: string) {
  return status === "active"
    ? <Badge>Ativa</Badge>
    : <Badge variant="outline">Inativa</Badge>;
}

async function errMsg(e: unknown) {
  if (e instanceof Response) return (await e.text()) || "Erro";
  return e instanceof Error ? e.message : "Erro inesperado";
}

function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet: company detail
  const [sheetCompany, setSheetCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<"membros" | "alunos">("membros");

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);

  // Students state
  const [companyStudents, setCompanyStudents] = useState<CompanyStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState<UnassignedStudent[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);

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
  const [addingMember, setAddingMember] = useState(false);

  // Remove member confirmation
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Role change in-progress
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  // Permission change in-progress (tracks userId)
  const [permChanging, setPermChanging] = useState<string | null>(null);

  // Add student dialog
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [studentToAdd, setStudentToAdd] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  // Remove student confirmation
  const [removeStudentTarget, setRemoveStudentTarget] = useState<CompanyStudent | null>(null);
  const [removingStudent, setRemovingStudent] = useState(false);

  // Server functions
  const listFn = useServerFn(listCompanies);
  const createFn = useServerFn(createCompany);
  const updateFn = useServerFn(updateCompany);
  const listMembersFn = useServerFn(listCompanyMembers);
  const addMemberFn = useServerFn(addCompanyMember);
  const removeMemberFn = useServerFn(removeCompanyMember);
  const updateRoleFn = useServerFn(updateCompanyMemberRole);
  const listUsersFn = useServerFn(listAdminUsers);
  const updatePermsFn = useServerFn(updateCompanyMemberPermissions);
  const listStudentsFn = useServerFn(listCompanyStudents);
  const listUnassignedFn = useServerFn(listStudentsWithoutCompany);
  const addStudentFn = useServerFn(addStudentToCompany);
  const removeStudentFn = useServerFn(removeStudentFromCompany);

  // ── Load page data ─────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const [companiesData, usersData] = await Promise.all([listFn(), listUsersFn()]);
      setCompanies((companiesData ?? []) as Company[]);
      setAllUsers(((usersData ?? []) as UserRow[]).sort((a, b) =>
        (a.email ?? "").localeCompare(b.email ?? ""),
      ));
    } catch (e) {
      toast.error(await errMsg(e));
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
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setMembersLoading(false);
    }
  };

  const loadCompanyStudents = async (companyId: string) => {
    setStudentsLoading(true);
    setCompanyStudents([]);
    try {
      const data = await listStudentsFn({ data: { companyId } });
      setCompanyStudents((data ?? []) as CompanyStudent[]);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openSheet = (company: Company) => {
    setSheetCompany(company);
    setActiveTab("membros");
    setMembers([]);
    setCompanyStudents([]);
    loadMembers(company.id);
    loadCompanyStudents(company.id);
  };

  const closeSheet = () => {
    setSheetCompany(null);
    setMembers([]);
    setCompanyStudents([]);
    setUnassignedStudents([]);
  };

  // ── Create company ─────────────────────────────────────────────────────────

  const submitCreate = async () => {
    if (!cName.trim()) return toast.error("Informe o nome da empresa.");
    setCreating(true);
    try {
      await createFn({ data: { name: cName.trim(), slug: cSlug.trim() || undefined } });
      toast.success("Empresa criada com sucesso.");
      setCName(""); setCSlug(""); setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setCreating(false);
    }
  };

  // ── Edit company ───────────────────────────────────────────────────────────

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
      if (sheetCompany?.id === editTarget.id) {
        setSheetCompany((prev) => prev
          ? { ...prev, name: eName.trim(), slug: eSlug.trim() || null, status: eStatus }
          : prev,
        );
      }
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setEditing(false);
    }
  };

  // ── Add member ─────────────────────────────────────────────────────────────

  const submitAddMember = async () => {
    if (!sheetCompany || !amUserId) return toast.error("Selecione um usuário.");
    setAddingMember(true);
    try {
      await addMemberFn({ data: { companyId: sheetCompany.id, userId: amUserId, role: amRole } });
      toast.success("Membro adicionado.");
      setAmUserId(""); setAmRole("coach"); setAddMemberOpen(false);
      await loadMembers(sheetCompany.id);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setAddingMember(false);
    }
  };

  // ── Remove member ──────────────────────────────────────────────────────────

  const confirmRemoveMember = async () => {
    if (!sheetCompany || !removeTarget) return;
    setRemovingMember(true);
    try {
      await removeMemberFn({ data: { companyId: sheetCompany.id, userId: removeTarget.user_id } });
      toast.success("Membro removido.");
      setRemoveTarget(null);
      await loadMembers(sheetCompany.id);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setRemovingMember(false);
    }
  };

  // ── Update member role ─────────────────────────────────────────────────────

  const changeRole = async (member: Member, role: CompanyRole) => {
    if (!sheetCompany || role === member.role) return;
    setRoleChanging(member.user_id);
    try {
      await updateRoleFn({ data: { companyId: sheetCompany.id, userId: member.user_id, role } });
      toast.success("Papel atualizado.");
      await loadMembers(sheetCompany.id);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setRoleChanging(null);
    }
  };

  // ── Update member permissions ──────────────────────────────────────────────

  const changePermissions = async (
    member: Member,
    patch: { canManageStudents?: boolean; canManageTraining?: boolean },
  ) => {
    if (!sheetCompany) return;
    setPermChanging(member.user_id);
    try {
      await updatePermsFn({
        data: {
          companyId: sheetCompany.id,
          userId: member.user_id,
          canManageStudents: patch.canManageStudents ?? member.can_manage_students,
          canManageTraining: patch.canManageTraining ?? member.can_manage_training,
        },
      });
      toast.success("Permissões atualizadas.");
      await loadMembers(sheetCompany.id);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setPermChanging(null);
    }
  };

  // ── Add student ────────────────────────────────────────────────────────────

  const openAddStudent = async () => {
    setStudentToAdd("");
    setUnassignedStudents([]);
    setAddStudentOpen(true);
    setUnassignedLoading(true);
    try {
      const data = await listUnassignedFn();
      setUnassignedStudents((data ?? []) as UnassignedStudent[]);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setUnassignedLoading(false);
    }
  };

  const submitAddStudent = async () => {
    if (!sheetCompany || !studentToAdd) return toast.error("Selecione um aluno.");
    setAddingStudent(true);
    try {
      await addStudentFn({ data: { companyId: sheetCompany.id, studentId: studentToAdd } });
      toast.success("Aluno vinculado à empresa.");
      setStudentToAdd(""); setAddStudentOpen(false);
      await loadCompanyStudents(sheetCompany.id);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setAddingStudent(false);
    }
  };

  // ── Remove student ─────────────────────────────────────────────────────────

  const confirmRemoveStudent = async () => {
    if (!sheetCompany || !removeStudentTarget) return;
    setRemovingStudent(true);
    try {
      await removeStudentFn({ data: { studentId: removeStudentTarget.id } });
      toast.success("Aluno desvinculado da empresa.");
      setRemoveStudentTarget(null);
      await loadCompanyStudents(sheetCompany.id);
    } catch (e) {
      toast.error(await errMsg(e));
    } finally {
      setRemovingStudent(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gerencie empresas, treinadores e alunos.</p>
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
                        <Button size="sm" variant="ghost" onClick={() => openSheet(c)}>
                          <Users className="size-4 mr-1" /> Gerenciar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
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
      <Sheet open={!!sheetCompany} onOpenChange={(v) => !v && closeSheet()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
          {/* Sheet header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-3">
              <Building2 className="size-5 shrink-0" />
              <span className="truncate">{sheetCompany?.name}</span>
              {sheetCompany && statusBadge(sheetCompany.status)}
            </SheetTitle>
            {sheetCompany && (
              <div className="pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(sheetCompany)}>
                  <Pencil className="size-3.5 mr-1" /> Editar empresa
                </Button>
              </div>
            )}
          </SheetHeader>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "membros" | "alunos")}
            className="flex-1 flex flex-col"
          >
            <TabsList className="mx-6 mt-4 mb-0 w-fit">
              <TabsTrigger value="membros">
                <Users className="size-3.5 mr-1.5" />
                Membros ({members.length})
              </TabsTrigger>
              <TabsTrigger value="alunos">
                <GraduationCap className="size-3.5 mr-1.5" />
                Alunos ({companyStudents.length})
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Membros ─────────────────────────────────────────────── */}
            <TabsContent value="membros" className="flex-1 px-6 pt-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Treinadores e gestores desta empresa.</p>
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
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Carregando membros…
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Nenhum membro ainda. Adicione um treinador para começar.
                </p>
              ) : (
                <TooltipProvider>
                <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome / Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const isRoleChanging = roleChanging === m.user_id;
                      const isPermChanging = permChanging === m.user_id;
                      const isAdminRole = m.role === "owner" || m.role === "admin";
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{m.full_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </TableCell>
                          <TableCell>
                            {isRoleChanging ? (
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
                          <TableCell>
                            {isAdminRole ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-xs cursor-default">
                                    Acesso administrativo
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-56 text-xs">
                                  Owner e Admin têm todas as permissões automaticamente pelo papel — os toggles não se aplicam.
                                </TooltipContent>
                              </Tooltip>
                            ) : isPermChanging ? (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Switch
                                    checked={m.can_manage_students}
                                    onCheckedChange={(v) =>
                                      changePermissions(m, { canManageStudents: v })
                                    }
                                    className="scale-75 origin-left"
                                  />
                                  <span className="text-xs text-muted-foreground">Alunos</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Switch
                                    checked={m.can_manage_training}
                                    onCheckedChange={(v) =>
                                      changePermissions(m, { canManageTraining: v })
                                    }
                                    className="scale-75 origin-left"
                                  />
                                  <span className="text-xs text-muted-foreground">Treinos</span>
                                </label>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon" variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 size-9"
                              onClick={() => setRemoveTarget(m)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                </TooltipProvider>
              )}
            </TabsContent>

            {/* ── Tab: Alunos ──────────────────────────────────────────────── */}
            <TabsContent value="alunos" className="flex-1 px-6 pt-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Alunos vinculados a esta empresa.</p>
                <Button size="sm" onClick={openAddStudent}>
                  <UserPlus className="size-4 mr-1" /> Vincular aluno
                </Button>
              </div>

              {studentsLoading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Carregando alunos…
                </div>
              ) : companyStudents.length === 0 ? (
                <div className="py-8 text-center">
                  <GraduationCap className="size-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum aluno vinculado ainda.
                  </p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={openAddStudent}>
                    <UserPlus className="size-4 mr-1" /> Vincular primeiro aluno
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Treinador</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{s.full_name}</p>
                          {s.email && (
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.coach_name ?? <span className="italic">Sem treinador</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon" variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 size-9"
                            onClick={() => setRemoveStudentTarget(s)}
                            title="Desvincular aluno"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
                <SelectTrigger id="estatus"><SelectValue /></SelectTrigger>
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
              {editing && <Loader2 className="size-4 mr-2 animate-spin" />}
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
                <SelectTrigger id="amrole"><SelectValue /></SelectTrigger>
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
            <Button onClick={submitAddMember} disabled={addingMember || !amUserId}>
              {addingMember ? <Loader2 className="size-4 mr-2 animate-spin" /> : <UserPlus className="size-4 mr-2" />}
              {addingMember ? "Adicionando…" : "Adicionar"}
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
            <AlertDialogCancel disabled={removingMember}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemoveMember}
              disabled={removingMember}
            >
              {removingMember ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add student dialog ─────────────────────────────────────────────── */}
      <Dialog open={addStudentOpen} onOpenChange={(v) => { if (!v) setStudentToAdd(""); setAddStudentOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular aluno</DialogTitle>
            <DialogDescription>
              Vincular aluno à empresa <strong>{sheetCompany?.name}</strong>.
              Apenas o vínculo com a empresa é alterado — treinador e demais dados do aluno permanecem intactos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="student-select">Aluno sem empresa *</Label>
            {unassignedLoading ? (
              <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" /> Carregando alunos disponíveis…
              </div>
            ) : (
              <Select value={studentToAdd} onValueChange={setStudentToAdd}>
                <SelectTrigger id="student-select">
                  <SelectValue placeholder="Selecione um aluno…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {unassignedStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-medium">{s.full_name}</span>
                      {s.email && (
                        <span className="ml-2 text-muted-foreground text-xs">{s.email}</span>
                      )}
                    </SelectItem>
                  ))}
                  {unassignedStudents.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Todos os alunos já estão vinculados a uma empresa.
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
            {!unassignedLoading && unassignedStudents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Se um aluno já está em outra empresa, desvinculá-lo primeiro antes de reassociar.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStudentToAdd(""); setAddStudentOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={submitAddStudent} disabled={addingStudent || !studentToAdd || unassignedLoading}>
              {addingStudent ? <Loader2 className="size-4 mr-2 animate-spin" /> : <UserPlus className="size-4 mr-2" />}
              {addingStudent ? "Vinculando…" : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove student confirmation ────────────────────────────────────── */}
      <AlertDialog open={!!removeStudentTarget} onOpenChange={(v) => !v && setRemoveStudentTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Desvincular <strong>{removeStudentTarget?.full_name}</strong> de{" "}
              <strong>{sheetCompany?.name}</strong>?
              O cadastro e o treinador do aluno não serão alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingStudent}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemoveStudent}
              disabled={removingStudent}
            >
              {removingStudent ? "Desvinculando…" : "Desvincular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
