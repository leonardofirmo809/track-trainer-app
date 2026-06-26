import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { createCoachAccount, removeCoachRole, updateCoachAccount } from "@/lib/admin-coaches.functions";
import { createCoachInvite, revokeCoachInvite, resendCoachInvite } from "@/lib/admin-invites.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Pencil, Plus, RefreshCw, ShieldOff, Trash2, UserPlus, Users, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/treinadores")({ component: AdminUsersPage });

const LIMIT_TOOLTIP = "Limite de licenças atingido. Entre em contato para ampliar seu plano.";

interface Invite {
  id: string;
  email: string;
  full_name: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  created_at: string;
  company_id: string | null;
  companies: { name: string } | null;
}

interface Company {
  id: string;
  name: string;
}

interface Coach {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  has_role: boolean;
  students_count: number;
}

interface Student {
  id: string;
  full_name: string;
  email: string | null;
  level: string | null;
  created_at: string;
}

interface CoachApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
}

function AdminUsersPage() {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [coachLimit, setCoachLimit] = useState(4);
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [openInvite, setOpenInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCompanyId, setInviteCompanyId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const createCoach = useServerFn(createCoachAccount);
  const removeRole = useServerFn(removeCoachRole);
  const updateCoach = useServerFn(updateCoachAccount);
  const createInviteFn = useServerFn(createCoachInvite);
  const revokeInviteFn = useServerFn(revokeCoachInvite);
  const resendInviteFn = useServerFn(resendCoachInvite);
  const [openManual, setOpenManual] = useState(false);
  const [mName, setMName] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mPass, setMPass] = useState("");
  const [mConfirm, setMConfirm] = useState("");
  const [mCreating, setMCreating] = useState(false);

  const [studentsOf, setStudentsOf] = useState<Coach | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<Coach | null>(null);
  const [removing, setRemoving] = useState(false);

  const [editTarget, setEditTarget] = useState<Coach | null>(null);
  const [edName, setEdName] = useState("");
  const [edEmail, setEdEmail] = useState("");
  const [edPass, setEdPass] = useState("");
  const [edConfirm, setEdConfirm] = useState("");
  const [edUpdating, setEdUpdating] = useState(false);


  const [applications, setApplications] = useState<CoachApplication[]>([]);
  const [rejectTarget, setRejectTarget] = useState<CoachApplication | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actioning, setActioning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [coachRes, inviteRes, settingRes, appsRes, companyRes] = await Promise.all([
      supabase.rpc("get_all_coaches"),
      supabase.from("coach_invites").select("*, companies(name)").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("value").eq("key", "max_coaches").maybeSingle(),
      supabase.from("coach_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    ]);
    if (coachRes.error) toast.error(coachRes.error.message);
    setCoaches((coachRes.data ?? []) as Coach[]);
    setInvites((inviteRes.data ?? []) as Invite[]);
    setApplications((appsRes.data ?? []) as CoachApplication[]);
    setCompanies((companyRes.data ?? []) as Company[]);
    const parsed = parseInt(settingRes.data?.value ?? "", 10);
    setCoachLimit(Number.isFinite(parsed) && parsed > 0 ? parsed : 4);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeCount = coaches.filter((c) => c.has_role).length;
  const atLimit = activeCount >= coachLimit;
  const usagePct = Math.min(100, Math.round((activeCount / Math.max(coachLimit, 1)) * 100));

  const inviteLink = (token: string) => `${window.location.origin}/aceitar-convite?token=${token}`;

  const createInvite = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Preencha nome e e-mail.");
    setCreating(true);
    try {
      const result = await createInviteFn({
        data: {
          email: email.trim(),
          fullName: name.trim(),
          companyId: inviteCompanyId || undefined,
        },
      });
      await navigator.clipboard.writeText(inviteLink(result.token)).catch(() => {});
      toast.success("Convite criado! Link copiado.");
      setName(""); setEmail(""); setInviteCompanyId(""); setOpenInvite(false);
      load();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(`Falha ao criar convite: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await revokeInviteFn({ data: { id } });
      toast.success("Convite revogado.");
      load();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    }
  };

  const resend = async (inv: Invite) => {
    try {
      const result = await resendInviteFn({ data: { id: inv.id } });
      await navigator.clipboard.writeText(inviteLink(result.token)).catch(() => {});
      toast.success("Novo link gerado e copiado.");
      load();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    }
  };

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(inviteLink(token));
    toast.success("Link copiado.");
  };

  const submitManual = async () => {
    if (mPass.length < 8) return toast.error("Senha deve ter ao menos 8 caracteres.");
    if (mPass !== mConfirm) return toast.error("As senhas não conferem.");
    setMCreating(true);
    try {
      await createCoach({ data: { fullName: mName.trim(), email: mEmail.trim(), password: mPass } });
      toast.success("Conta criada com sucesso.");
      setMName(""); setMEmail(""); setMPass(""); setMConfirm("");
      setOpenManual(false);
      load();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setMCreating(false);
    }
  };

  const openStudents = async (coach: Coach) => {
    setStudentsOf(coach);
    setStudents(null);
    setLoadingStudents(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, email, level, created_at")
      .eq("coach_id", coach.id)
      .order("created_at", { ascending: false });
    setLoadingStudents(false);
    if (error) return toast.error(error.message);
    setStudents((data ?? []) as Student[]);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeRole({ data: { userId: removeTarget.id } });
      toast.success("Acesso removido.");
      setRemoveTarget(null);
      load();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setRemoving(false);
    }
  };

  const openEdit = (c: Coach) => {
    setEdName(c.full_name ?? "");
    setEdEmail(c.email);
    setEdPass("");
    setEdConfirm("");
    setEditTarget(c);
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (edPass && edPass.length < 8) return toast.error("A nova senha deve ter ao menos 8 caracteres.");
    if (edPass && edPass !== edConfirm) return toast.error("As senhas não conferem.");
    setEdUpdating(true);
    try {
      await updateCoach({
        data: {
          userId: editTarget.id,
          fullName: edName.trim(),
          email: edEmail.trim(),
          ...(edPass ? { password: edPass } : {}),
        },
      });
      toast.success("Treinador atualizado com sucesso.");
      setEditTarget(null);
      load();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : e instanceof Error ? e.message : "Erro";
      toast.error(msg);
    } finally {
      setEdUpdating(false);
    }
  };

  const approveApp = async (app: CoachApplication) => {
    setActioning(true);
    const { error } = await supabase.rpc("approve_coach_application", { _application_id: app.id });
    setActioning(false);
    if (error) return toast.error(error.message);
    toast.success(`${app.full_name} aprovado como treinador.`);
    load();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setActioning(true);
    const { error } = await supabase.rpc("reject_coach_application", {
      _application_id: rejectTarget.id,
      _notes: rejectNotes.trim() || undefined,
    });
    setActioning(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação recusada.");
    setRejectTarget(null); setRejectNotes("");
    load();
  };

  const appStatusBadge = (s: CoachApplication["status"]) => {
    if (s === "pending") return <Badge variant="secondary">Pendente</Badge>;
    if (s === "approved") return <Badge>Aprovado</Badge>;
    return <Badge variant="outline">Recusado</Badge>;
  };

  const inviteStatusBadge = (s: Invite["status"]) => {
    if (s === "pending") return <Badge variant="secondary">Pendente</Badge>;
    if (s === "accepted") return <Badge>Aceito</Badge>;
    return <Badge variant="outline">Revogado</Badge>;
  };

  return (
    <TooltipProvider>
      <div className="space-y-8 max-w-6xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-[260px]">
            <h1 className="text-3xl font-display font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie treinadores e convites.</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Treinadores: {activeCount} / {coachLimit}</span>
                {atLimit && <Badge variant="destructive">Limite atingido</Badge>}
              </div>
              <Progress value={usagePct} className={atLimit ? "[&>div]:bg-destructive" : ""} />
            </div>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Dialog open={openManual} onOpenChange={(v) => !atLimit && setOpenManual(v)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={atLimit}>
                        <KeyRound className="size-4 mr-2" /> Criar conta manual
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar conta manual</DialogTitle>
                        <DialogDescription>A conta fica ativa imediatamente.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="mname">Nome completo</Label><Input id="mname" value={mName} onChange={(e) => setMName(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="memail">Email</Label><Input id="memail" type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="mpass">Senha (mín. 8)</Label><Input id="mpass" type="password" value={mPass} onChange={(e) => setMPass(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="mconfirm">Confirmar senha</Label><Input id="mconfirm" type="password" value={mConfirm} onChange={(e) => setMConfirm(e.target.value)} /></div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenManual(false)}>Cancelar</Button>
                        <Button onClick={submitManual} disabled={mCreating}>{mCreating ? "Criando…" : "Criar conta"}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </span>
              </TooltipTrigger>
              {atLimit && <TooltipContent>{LIMIT_TOOLTIP}</TooltipContent>}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Dialog open={openInvite} onOpenChange={(v) => !atLimit && setOpenInvite(v)}>
                    <DialogTrigger asChild>
                      <Button disabled={atLimit}><UserPlus className="size-4 mr-2" /> Convidar treinador</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Convidar treinador</DialogTitle>
                        <DialogDescription>O convite gera um link válido por 7 dias.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="iname">Nome completo</Label><Input id="iname" value={name} onChange={(e) => setName(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="iemail">Email</Label><Input id="iemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                        {companies.length > 0 && (
                          <div className="space-y-2">
                            <Label>Empresa (opcional)</Label>
                            <Select value={inviteCompanyId} onValueChange={setInviteCompanyId}>
                              <SelectTrigger><SelectValue placeholder="Sem empresa" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Sem empresa</SelectItem>
                                {companies.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Se selecionada, o coach é adicionado automaticamente à empresa ao aceitar o convite.
                            </p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenInvite(false)}>Cancelar</Button>
                        <Button onClick={createInvite} disabled={creating}><Plus className="size-4 mr-2" />{creating ? "Criando…" : "Criar convite"}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </span>
              </TooltipTrigger>
              {atLimit && <TooltipContent>{LIMIT_TOOLTIP}</TooltipContent>}
            </Tooltip>
          </div>
        </div>

        <Tabs defaultValue="treinadores">
          <TabsList>
            <TabsTrigger value="treinadores">Treinadores</TabsTrigger>
            <TabsTrigger value="solicitacoes">
              Solicitações
              {applications.filter((a) => a.status === "pending").length > 0 && (
                <Badge variant="secondary" className="ml-2">{applications.filter((a) => a.status === "pending").length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="convites">Convites</TabsTrigger>
          </TabsList>

          <TabsContent value="treinadores" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? <p className="text-muted-foreground">Carregando…</p> : coaches.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum treinador cadastrado.</p>
                ) : (
                  <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coaches.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{c.email}</TableCell>
                          <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            {c.has_role ? <Badge>Ativo</Badge> : <Badge variant="outline">Sem acesso</Badge>}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => openStudents(c)}>
                              <Users className="size-4 mr-1" /> {c.students_count}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Editar treinador">
                              <Pencil className="size-4" />
                            </Button>
                            {c.has_role && c.id !== user?.id && (
                              <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(c)} title="Remover acesso">
                                <ShieldOff className="size-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="solicitacoes" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? <p className="text-muted-foreground">Carregando…</p> : applications.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma solicitação de cadastro.</p>
                ) : (
                  <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Recebida em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{a.email}</TableCell>
                          <TableCell>{a.phone ?? "—"}</TableCell>
                          <TableCell>{new Date(a.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{appStatusBadge(a.status)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            {a.status === "pending" && (
                              <>
                                <Button size="sm" onClick={() => approveApp(a)} disabled={actioning}>
                                  <Check className="size-4 mr-1" /> Aprovar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setRejectTarget(a)} disabled={actioning}>
                                  <X className="size-4 mr-1" /> Recusar
                                </Button>
                              </>
                            )}
                            {a.status === "rejected" && a.notes && (
                              <span className="text-xs text-muted-foreground italic">{a.notes}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="convites" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? <p className="text-muted-foreground">Carregando…</p> : invites.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum convite ainda.</p>
                ) : (
                  <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.full_name}</TableCell>
                          <TableCell>{i.email}</TableCell>
                          <TableCell className="text-muted-foreground">{i.companies?.name ?? "—"}</TableCell>
                          <TableCell>{inviteStatusBadge(i.status)}</TableCell>
                          <TableCell>{new Date(i.expires_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-right space-x-1">
                            {i.status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => copy(i.token)}><Copy className="size-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => resend(i)}><RefreshCw className="size-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => revoke(i.id)}><Trash2 className="size-4" /></Button>
                              </>
                            )}
                            {i.status === "revoked" && (
                              <Button size="sm" variant="ghost" onClick={() => resend(i)}><RefreshCw className="size-4" /></Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Sheet open={!!studentsOf} onOpenChange={(v) => !v && setStudentsOf(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Alunos de {studentsOf?.full_name ?? "—"}</SheetTitle>
              <SheetDescription>{studentsOf?.email}</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {loadingStudents ? <p className="text-muted-foreground">Carregando…</p> : (students?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground">Este treinador ainda não tem alunos.</p>
              ) : (
                <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nível</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students!.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                        <TableCell>{s.level ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar treinador</DialogTitle>
              <DialogDescription>
                Editando <strong>{editTarget?.full_name ?? editTarget?.email}</strong>. Deixe a senha em branco para não alterá-la.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edname">Nome completo</Label>
                <Input id="edname" value={edName} onChange={(e) => setEdName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edemail">Email</Label>
                <Input id="edemail" type="email" value={edEmail} onChange={(e) => setEdEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edpass">
                  Nova senha{" "}
                  <span className="text-muted-foreground font-normal text-xs">(opcional, mín. 8 caracteres)</span>
                </Label>
                <Input
                  id="edpass"
                  type="password"
                  value={edPass}
                  onChange={(e) => setEdPass(e.target.value)}
                  placeholder="Deixe em branco para não alterar"
                  autoComplete="new-password"
                />
              </div>
              {edPass && (
                <div className="space-y-2">
                  <Label htmlFor="edconfirm">Confirmar nova senha</Label>
                  <Input
                    id="edconfirm"
                    type="password"
                    value={edConfirm}
                    onChange={(e) => setEdConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={edUpdating}>
                Cancelar
              </Button>
              <Button onClick={submitEdit} disabled={edUpdating}>
                {edUpdating ? "Salvando…" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover acesso de {removeTarget?.full_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Os alunos, planos e testes deste treinador serão preservados. Ele não conseguirá mais acessar o sistema enquanto a role estiver removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemove} disabled={removing}>
                {removing ? "Removendo…" : "Remover acesso"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!rejectTarget} onOpenChange={(v) => { if (!v) { setRejectTarget(null); setRejectNotes(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recusar solicitação de {rejectTarget?.full_name}?</DialogTitle>
              <DialogDescription>Você pode adicionar uma nota explicando o motivo — ela será exibida ao usuário ao tentar entrar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rnotes">Motivo (opcional)</Label>
              <Textarea id="rnotes" value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Ex.: Solicitação não atende aos requisitos." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNotes(""); }} disabled={actioning}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmReject} disabled={actioning}>{actioning ? "Recusando…" : "Recusar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
