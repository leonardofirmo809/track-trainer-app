import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/alunos")({ component: AdminStudentsPage });

interface Student {
  id: string;
  full_name: string;
  email: string | null;
  level: string | null;
  target_distance: string | null;
  coach_id: string;
  created_at: string;
}

function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coachMap, setCoachMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [coach, setCoach] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("students").select("id, full_name, email, level, target_distance, coach_id, created_at").order("created_at", { ascending: false });
      const studs = (s ?? []) as Student[];
      setStudents(studs);
      const ids = Array.from(new Set(studs.map((x) => x.coach_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: { id: string; full_name: string | null }) => { map[p.id] = p.full_name ?? "—"; });
        setCoachMap(map);
      }
      setLoading(false);
    })();
  }, []);

  const coaches = useMemo(() => Object.entries(coachMap).sort((a, b) => a[1].localeCompare(b[1])), [coachMap]);

  const filtered = students.filter((s) => {
    if (coach !== "all" && s.coach_id !== coach) return false;
    if (q) {
      const t = q.toLowerCase();
      if (!s.full_name.toLowerCase().includes(t) && !(s.email?.toLowerCase().includes(t))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Alunos (todos)</h1>
        <p className="text-muted-foreground">Visão global de todos os alunos cadastrados na plataforma.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>{filtered.length} aluno(s)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={coach} onValueChange={setCoach}>
            <SelectTrigger className="sm:w-64"><SelectValue placeholder="Treinador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os treinadores</SelectItem>
              {coaches.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? <p className="text-muted-foreground">Carregando…</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground">Nenhum aluno encontrado.</p>
          ) : (
            <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Treinador</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>Cadastrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                    <TableCell>{coachMap[s.coach_id] ?? "—"}</TableCell>
                    <TableCell>{s.level ? <Badge variant="secondary">{s.level}</Badge> : "—"}</TableCell>
                    <TableCell>{s.target_distance ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
