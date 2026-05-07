import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/alunos/$studentId")({ component: PerfilAluno });

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm mt-1">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function PerfilAluno() {
  const { studentId } = Route.useParams();

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

  if (student.isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!student.data) return <p>Aluno não encontrado.</p>;
  const s = student.data;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/alunos"><ArrowLeft /> Voltar para alunos</Link></Button>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-5 flex-wrap">
          <Avatar className="size-16"><AvatarFallback className="text-lg">{s.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl font-display font-bold">{s.full_name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {s.email && <span className="flex items-center gap-1"><Mail className="size-4" /> {s.email}</span>}
              {s.phone && <span className="flex items-center gap-1"><Phone className="size-4" /> {s.phone}</span>}
              {s.birth_date && <span className="flex items-center gap-1"><Calendar className="size-4" /> {new Date(s.birth_date).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {s.level && <Badge variant="secondary" className="capitalize">{s.level}</Badge>}
            {s.target_distance && <Badge>{s.target_distance.toUpperCase()}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dados">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full lg:w-auto">
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
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Tempo (s)</TableHead><TableHead>Pace (s/km)</TableHead><TableHead>Observações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tests.data.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.test_date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell><Badge variant="outline">{t.test_type}</Badge></TableCell>
                        <TableCell>{t.duration_seconds ?? "—"}</TableCell>
                        <TableCell>{t.pace_seconds_per_km ?? "—"}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{t.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tipo</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {plans.data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><Badge>{p.plan_type.toUpperCase()}</Badge></TableCell>
                        <TableCell>{p.start_date ? new Date(p.start_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell>{p.end_date ? new Date(p.end_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma planilha gerada ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
