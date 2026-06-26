import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createStudent, listAccessibleCompanies } from "@/lib/students.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alunos/novo")({ component: NovoAluno });

interface Company { id: string; name: string }

function NovoAluno() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", birth_date: "", gender: "",
    goal: "", level: "", target_distance: "", injury_history: "", notes: "",
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const createFn = useServerFn(createStudent);
  const listCompaniesFn = useServerFn(listAccessibleCompanies);

  useEffect(() => {
    listCompaniesFn()
      .then((data) => {
        const list = (data ?? []) as Company[];
        setCompanies(list);
        if (list.length === 1) setSelectedCompanyId(list[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const student = await createFn({
        data: {
          fullName: form.full_name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          birthDate: form.birth_date || undefined,
          gender: form.gender || undefined,
          goal: form.goal || undefined,
          level: (form.level as "iniciante" | "intermediario" | "avancado") || undefined,
          targetDistance: (form.target_distance as "5km" | "10km" | "21km" | "42km") || undefined,
          injuryHistory: form.injury_history || undefined,
          notes: form.notes || undefined,
          companyId: selectedCompanyId || undefined,
        },
      });
      toast.success("Aluno cadastrado!");
      navigate({ to: "/alunos/$studentId", params: { studentId: student.id } });
    } catch (e: unknown) {
      const msg = e instanceof Response
        ? await e.text()
        : e instanceof Error ? e.message : "Erro ao cadastrar aluno";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/alunos"><ArrowLeft /> Voltar</Link></Button>
        <h1 className="text-3xl font-display font-bold">Novo aluno</h1>
        <p className="text-muted-foreground">Preencha os dados do corredor</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Nome completo *</Label><Input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Data de nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Objetivo & nível</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Objetivo</Label><Textarea rows={2} value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder="Ex.: completar primeira meia maratona em sub 2h" /></div>
            <div className="space-y-2">
              <Label>Nível</Label>
              <Select value={form.level} onValueChange={(v) => set("level", v)}>
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
              <Select value={form.target_distance} onValueChange={(v) => set("target_distance", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5km">5KM</SelectItem>
                  <SelectItem value="10km">10KM</SelectItem>
                  <SelectItem value="21km">21KM</SelectItem>
                  <SelectItem value="42km">42KM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Company selector — shown only when user has accessible companies */}
        {companies.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Empresa</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Sem empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem empresa</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Selecione a empresa à qual este aluno pertence.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Saúde & observações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Histórico de lesões</Label><Textarea rows={3} value={form.injury_history} onChange={(e) => set("injury_history", e.target.value)} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild><Link to="/alunos">Cancelar</Link></Button>
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Cadastrar aluno"}</Button>
        </div>
      </form>
    </div>
  );
}
