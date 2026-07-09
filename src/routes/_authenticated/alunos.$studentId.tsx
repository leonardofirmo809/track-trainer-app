import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStudentPermissions, updateStudent } from "@/lib/students.functions";
import { getStudentStravaActivities } from "@/lib/strava.functions";
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
import { ArrowLeft, Mail, Phone, Calendar, Eye, Settings2, Pencil, Link2 } from "lucide-react";
import { formatMmss } from "@/lib/teste-3km";

export const Route = createFileRoute("/_authenticated/alunos/$studentId")({ component: PerfilAluno });

function isPlanExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  const d = new Date();
  const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return endDate < todayIso;
}

function fmtPace(paceSec: number | null): string {
  if (!paceSec || paceSec <= 0) return "—";
  const m = Math.floor(paceSec / 60);
  const s = paceSec % 60;
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDist(m: number): string {
  return (m / 1000).toFixed(2) + " km";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

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

  const stravaQ = useQuery({
    queryKey: ["student-strava", studentId],
    queryFn: () => getStudentStravaActivities({ data: { studentId } }),
    enabled: !!student.data,
    staleTime: 120_000,
  });

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editPerms, setEditPerms] = useState({
    canEditCadastral: false,
    canEditTraining: false,
    canCustomizeTraining: false,
    loaded: false,
  });

  const getPermsFn = useServerFn(getStudentPermissions);
  const updateFn = useServerFn(updateStudent);

  // Load permissions once student data is available
  useEffect(() => {
    if (!student.data) return;
    getPermsFn({ data: { studentId } })
      .then((perms) => {
        const p = perms as { canEditCadastral: boolean; canEditTraining: boolean; canCustomizeTraining: boolean };
        setEditPerms({
          canEditCadastral: p.canEditCadastral,
          canEditTraining: p.canEditTraining,
          canCustomizeTraining: p.canCustomizeTraining,
          loaded: true,
        });
      })
      .catch(() => setEditPerms({ canEditCadastral: false, canEditTraining: false, canCustomizeTraining: false, loaded: true }));
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
        <CardContent className="p-4 sm:p-6 flex items-center gap-4 flex-wrap">
          <Avatar className="size-12 sm:size-16 shrink-0">
            <AvatarFallback className="text-base sm:text-lg">{s.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-display font-bold truncate">{s.full_name}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-sm text-muted-foreground">
              {s.email && <span className="flex items-center gap-1 truncate"><Mail className="size-3.5 shrink-0" /> {s.email}</span>}
              {s.phone && <span className="flex items-center gap-1"><Phone className="size-3.5 shrink-0" /> {s.phone}</span>}
              {s.birth_date && <span className="flex items-center gap-1"><Calendar className="size-3.5 shrink-0" /> {new Date(s.birth_date).toLocaleDateString("pt-BR")}</span>}
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
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 w-full lg:w-auto">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="objetivo">Objetivo</TabsTrigger>
          <TabsTrigger value="lesoes">Lesões</TabsTrigger>
          <TabsTrigger value="obs">Observações</TabsTrigger>
          <TabsTrigger value="testes">Testes</TabsTrigger>
          <TabsTrigger value="planilhas">Planilhas</TabsTrigger>
          <TabsTrigger value="strava" className="flex items-center gap-1">
            <Link2 className="size-3.5" /> Strava
          </TabsTrigger>
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
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                            {isPlanExpired(p.end_date) && <Badge variant="destructive">Vencido</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {editPerms.canCustomizeTraining ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              title="Personalização livre da prescrição — sobrescreve a visualização do aluno com semanas e sessões editadas manualmente."
                            >
                              <Link to="/alunos/$studentId/prescricao/$planId" params={{ studentId, planId: p.id }}>
                                <Settings2 className="h-3.5 w-3.5 mr-1" /> Editor avançado
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

        <TabsContent value="strava" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" />
                <CardTitle>Atividades Strava</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              {stravaQ.isLoading && (
                <p className="p-6 text-sm text-muted-foreground">Carregando atividades…</p>
              )}
              {stravaQ.isError && (
                <p className="p-6 text-sm text-destructive">Erro ao carregar atividades do aluno.</p>
              )}
              {stravaQ.data && !stravaQ.data.stravaConnected && (
                <p className="p-6 text-sm text-muted-foreground">
                  Este aluno ainda não conectou o Strava. As atividades aparecerão aqui após a conexão e sincronização na conta do aluno.
                </p>
              )}
              {stravaQ.data?.stravaConnected && stravaQ.data.activities.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">
                  Nenhuma corrida sincronizada ainda. Solicite ao aluno que acesse Minha Conta e sincronize as atividades.
                </p>
              )}
              {stravaQ.data?.stravaConnected && stravaQ.data.activities.length > 0 && (
                <div className="-mx-2 sm:mx-0 overflow-x-auto px-4">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left pb-2 pr-4">Data</th>
                        <th className="text-left pb-2 pr-4">Nome</th>
                        <th className="text-right pb-2 pr-4">Distância</th>
                        <th className="text-right pb-2 pr-4">Tempo</th>
                        <th className="text-right pb-2 pr-4">Pace</th>
                        <th className="text-right pb-2 pr-4">Desnível</th>
                        <th className="text-right pb-2">FC Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stravaQ.data.activities.map((a) => (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground text-xs">
                            {a.startDate ? fmtDate(a.startDate) : "—"}
                          </td>
                          <td className="py-2 pr-4 max-w-[180px] truncate font-medium">
                            {a.name ?? "—"}
                          </td>
                          <td className="py-2 pr-4 text-right whitespace-nowrap">
                            {a.distanceM != null ? fmtDist(a.distanceM) : "—"}
                          </td>
                          <td className="py-2 pr-4 text-right whitespace-nowrap">
                            {a.movingTimeSec != null ? fmtDuration(a.movingTimeSec) : "—"}
                          </td>
                          <td className="py-2 pr-4 text-right whitespace-nowrap">
                            {fmtPace(a.paceSec)}
                          </td>
                          <td className="py-2 pr-4 text-right whitespace-nowrap text-muted-foreground">
                            {(a.elevationGainM ?? 0) > 0 ? `+${Math.round(a.elevationGainM!)}m` : "—"}
                          </td>
                          <td className="py-2 text-right whitespace-nowrap text-muted-foreground">
                            {a.avgHeartrate ? `${Math.round(a.avgHeartrate)} bpm` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <SheetFooter className="sticky bottom-0 bg-background border-t -mx-6 px-6 py-4 mt-6 flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? "Salvando…" : "Salvar"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
