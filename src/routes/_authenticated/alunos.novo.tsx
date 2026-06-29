import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createStudent, listAccessibleCompanies } from "@/lib/students.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alunos/novo")({ component: NovoAluno });

interface Company { id: string; name: string }

function NovoAluno() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
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
    <div className="max-w-xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/alunos"><ArrowLeft /> Voltar</Link></Button>
        <h1 className="text-3xl font-display font-bold">Novo aluno</h1>
        <p className="text-muted-foreground">Preencha os dados básicos do corredor</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Dados de contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Nome completo *</Label><Input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          </CardContent>
        </Card>

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

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/alunos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Salvando…" : "Cadastrar aluno"}
          </Button>
        </div>
      </form>
    </div>
  );
}
