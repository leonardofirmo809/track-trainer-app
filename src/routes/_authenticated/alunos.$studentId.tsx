import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStudentPermissions, updateStudent } from "@/lib/students.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, Calendar, Eye, Settings2, Pencil } from "lucide-react";
import { formatMmss } from "@/lib/teste-3km";

export const Route = createFileRoute("/_authenticated/alunos/$studentId")({ component: PerfilAluno });

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm mt-1">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

const EMPTY_FORM = {
  full_name: "", email: "", phone: "", birth_date: "", gender: "",
  goal: "", level: "", target_distance: "", injury_history: "", notes: "",
};

function PerfilAluno() {
  const { studentId } = Route.useParams();
  const qc = useQueryClient();

  const student = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").eq("id", studentId).single();
      if (error) throw error;
      return data;
    },
  });

  const tests = useQuery({
    queryKey: ["tests", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("tests").select("*").eq("student_id", studentId).order("test_date", { ascending: false });
      return data ?? [];
    },
  });

  const plans = useQuery({
    queryKey: ["plans", studentId],
    queryFn: async () => {
      const { data } = await supabase.from("training_plans").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editPerms, setEditPerms] = useState({ canEditCadastral: false, canEditTraining: false, loaded: false });

  const getPermsFn = useServerFn(getStudentPermissions);
  const updateFn = useServerFn(updateStudent);

  // Load permissions once student data is available
  useEffect(() => {
    if (!student.data) return;
    getPermsFn({ data: { studentId } })
      .then((perms) => {
        const p = perms as { canEditCadastral: boolean; canEditTraining: boolean };
        setEditPerms({ canEditCadastral: p.canEditCadastral, canEditTraining: p.canEditTraining, loaded: true });
      })
      .catch(() => setEditPerms({ canEditCadastral: false, canEditTraining: false, loaded: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.data?.id]);

  const openEdit = () => {
    const s = student.data!;
    setEditForm({
      full_name: s.full_name ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      birth_date: s.birth_date ?? "",
      gender: s.gender ?? "",
      goal: s.goal ?? "",
      level: s.level ?? "",
      target_distance: s.target_distance ?? "",
      injury_history: s.injury_history ?? "",
      notes: s.notes ?? "",
    });
    setEditOpen(true);
  };

  const setF = (k: keyof typeof EMPTY_FORM, v: string) => setEditForm((p) => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    if (editPerms.canEditCadastral && editForm.full_name.trim().length < 2) {
      toast.error("Nome deve ter ao menos 2 caracteres.");
      return;
    }
    setEditSaving(true);
    try {
      await updateFn({
        data: {
          studentId,
          updateCadastral: editPerms.canEditCadastral,
          updateTraining: editPerms.canEditTraining,
          ...(editPerms.canEditCadastral && {
            fullName: editForm.full_name,
            email: editForm.email,
            phone: editForm.phone,
            birthDate: editForm.birth_date,
            gender: editForm.gender,
          }),
          ...(editPerms.canEditTraining && {
            goal: editForm.goal,
            level: (editForm.level as "iniciante" | "intermediario" | "avancado") || undefined,
            targetDistance: (editForm.target_distance as "5km" | "10km" | "21km" | "42km") || undefined,
            injuryHistory: editForm.injury_history,
            notes: editForm.notes,
          }),
        },
      });
      toast.success("Aluno atualizado!");
      qc.invalidateQueries({ queryKey: ["student", studentId] });
      setEditOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Response
        ? await e.text()
        : e instanceof Error ? e.message : "Erro ao atualizar aluno";
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  if (student.isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!student.data) return <p>Aluno não encontrado.</p>;
  const s = student.data;
  const canEdit = editPerms.loaded && (editPerms.canEditCadastral || editPerms.canEditTraining);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/alunos"><ArrowLeft /> Voltar para alunos</Link></Button>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-5 flex-wrap">
          <Avatar className="size-16"><AvatarFallback className="text-lg">{s.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold">{s.full_name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {s.email && <span className="flex items-center gap-1"><Mail className="size-4" /> {s.email}</span>}
              {s.phone && <span className="flex items-center gap-1"><Phone className="size-4" /> {s.phone}</span>}
              {s.birth_date && <span className="flex items-center gap-1"><Calendar className="size-4" /> {new Date(s.birth_date).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {s.level && <Badge variant="secondary" className="capitalize">{s.level}</Badge>}
            {s.target_distance && <Badge>{s.target_distance.toUpperCase()}</Badge>}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={openEdit}>
                <Pencil className="size-3.5 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dados">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full lg:w-auto">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="objetivo">Objetivo</TabsTrigger>
          <TabsTrigger value="lesoes">Lesões</TabsTrigger>
          <TabsTrigger value="obs">Observações</TabsTrigger>
          <TabsTrigger value="testes">Testes</TabsTrigger>
          <TabsTrigger value="planilhas">Planilhas</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <Card><CardContent className="p-6 grid gap-5 md:grid-cols-2">
            <Field label="Nome" value={s.full_name} />
            <Field label="Email" value={s.email} />
            <Field label="Telefone" value={s.phone} />
            <Field label="Data de nascimento" value={s.birth_date ? new Date(s.birth_date).toLocaleDateString("pt-BR") : null} />
            <Field label="Sexo" value={s.gender} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="objetivo" className="mt-4">
          <Card><CardContent className="p-6 grid gap-5 md:grid-cols-2">
            <Field label="Objetivo" value={s.goal} />
            <Field label="Nível" value={s.level} />
            <Field label="Distância-alvo" value={s.target_distance?.toUpperCase()} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="lesoes" className="mt-4">
          <Card><CardContent className="p-6"><Field label="Histórico de lesões" value={s.injury_history} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="obs" className="mt-4">
          <Card><CardContent className="p-6"><Field label="Observações" value={s.notes} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="testes" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Histórico de testes</CardTitle></CardHeader>
            <CardContent className="p-0">
              {tests.data && tests.data.length > 0 ? (
                <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[640px]">
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Tempo</TableHead><TableHead>FTP (min/km)</TableHead><TableHead>Zonas</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tests.data.map((t) => {
                      const meta = (t.metadata ?? {}) as { ftp_seconds_per_km?: number; zones?: Array<{ id: string; level: string; pseMin: number; pseMax: number; phrase: string; paceSlowSec?: number | null; paceFastSec?: number | null; paceFromSec?: number | null; paceToSec?: number; velFrom: number; velTo: number | null }> };
                      return (
                        <TableRow key={t.id}>
                          <TableCell>{new Date(t.test_date).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell><Badge variant="outline">{t.test_type}</Badge></TableCell>
                          <TableCell className="font-mono">{t.duration_seconds ? formatMmss(t.duration_seconds) : "—"}</TableCell>
                          <TableCell className="font-mono">{meta.ftp_seconds_per_km ? formatMmss(meta.ftp_seconds_per_km) : (t.pace_seconds_per_km ? formatMmss(t.pace_seconds_per_km) : "—")}</TableCell>
                          <TableCell>
                            {meta.zones && meta.zones.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline"><Eye /> Ver zonas</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader><DialogTitle>Zonas — {new Date(t.test_date).toLocaleDateString("pt-BR")}</DialogTitle></DialogHeader>
                                  <div className="space-y-2">
                                    {meta.zones.map((z) => (
                                      <div key={z.id} className="rounded-md border p-3 grid gap-2 sm:grid-cols-4 items-center">
                                        <div>
                                          <p className="font-display font-bold">{z.id}</p>
                                          <p className="text-xs text-muted-foreground">{z.level}</p>
                                        </div>
                                        <div className="text-sm font-mono">
                                          <p className="text-xs text-muted-foreground">PACE</p>
                                          {(() => { const slow = z.paceSlowSec ?? z.paceFromSec ?? null; const fast = z.paceFastSec ?? z.paceToSec ?? null; return `${fast == null ? "Máx" : formatMmss(fast)} → ${slow == null ? "Máx" : formatMmss(slow)}`; })()}
                                        </div>
                                        <div className="text-sm font-mono">
                                          <p className="text-xs text-muted-foreground">km/h</p>
                                          {z.velTo == null ? "Máx" : z.velTo.toFixed(1)} → {z.velFrom.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">PSE {z.pseMin}–{z.pseMax}<br/><span className="italic">"{z.phrase}"</span></div>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table></div>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">Nenhum teste registrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planilhas" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Histórico de planilhas</CardTitle></CardHeader>
            <CardContent className="p-0">
              {plans.data && plans.data.length > 0 ? (
                <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[640px]">
                  <TableHeader><TableRow>
                    <TableHead>Tipo</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {plans.data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><Badge>{p.plan_type.toUpperCase()}</Badge></TableCell>
                        <TableCell>{p.start_date ? new Date(p.start_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>{p.end_date ? new Date(p.end_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/alunos/$studentId/prescricao/$planId" params={{ studentId, planId: p.id }}>
                              <Settings2 className="h-3.5 w-3.5 mr-1" /> Personalizar
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></div>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma planilha gerada ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar aluno</SheetTitle>
            <SheetDescription>Salve as alterações ao final.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {editPerms.canEditCadastral && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados cadastrais</p>
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <Input value={editForm.full_name} onChange={(e) => setF("full_name", e.target.value)} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={(e) => setF("email", e.target.value)} maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editForm.phone} onChange={(e) => setF("phone", e.target.value)} maxLength={32} />
                </div>
                <div className="space-y-2">
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={editForm.birth_date} onChange={(e) => setF("birth_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={editForm.gender} onValueChange={(v) => setF("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {editPerms.canEditCadastral && editPerms.canEditTraining && <Separator />}

            {editPerms.canEditTraining && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Objetivo & treino</p>
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Textarea rows={2} value={editForm.goal} onChange={(e) => setF("goal", e.target.value)} maxLength={500} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nível</Label>
                    <Select value={editForm.level} onValueChange={(v) => setF("level", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Distância-alvo</Label>
                    <Select value={editForm.target_distance} onValueChange={(v) => setF("target_distance", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5km">5KM</SelectItem>
                        <SelectItem value="10km">10KM</SelectItem>
                        <SelectItem value="21km">21KM</SelectItem>
                        <SelectItem value="42km">42KM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Histórico de lesões</Label>
                  <Textarea rows={3} value={editForm.injury_history} onChange={(e) => setF("injury_history", e.target.value)} maxLength={2000} />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea rows={3} value={editForm.notes} onChange={(e) => setF("notes", e.target.value)} maxLength={1000} />
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="mt-8 flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? "Salvando…" : "Salvar"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
