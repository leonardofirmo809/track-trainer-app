import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/alunos/")({ component: AlunosList });

function AlunosList() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [dist, setDist] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((s) => {
    if (q && !s.full_name.toLowerCase().includes(q.toLowerCase())) return false;
    if (level !== "all" && s.level !== level) return false;
    if (dist !== "all" && s.target_distance !== dist) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Alunos</h1>
          <p className="text-muted-foreground">Gerencie todos os corredores que você acompanha</p>
        </div>
        <Button asChild><Link to="/alunos/novo"><Plus /> Novo aluno</Link></Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nível" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="iniciante">Iniciante</SelectItem>
                <SelectItem value="intermediario">Intermediário</SelectItem>
                <SelectItem value="avancado">Avançado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dist} onValueChange={setDist}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Distância" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas distâncias</SelectItem>
                <SelectItem value="5km">5KM</SelectItem>
                <SelectItem value="10km">10KM</SelectItem>
                <SelectItem value="21km">21KM</SelectItem>
                <SelectItem value="42km">42KM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="size-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Nenhum aluno encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">Comece cadastrando seu primeiro corredor</p>
              <Button asChild className="mt-4"><Link to="/alunos/novo">Cadastrar aluno</Link></Button>
            </div>
          ) : (
            <div className="-mx-2 sm:mx-0 overflow-x-auto"><Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Distância-alvo</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9"><AvatarFallback>{s.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.email ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{s.level ? <Badge variant="secondary" className="capitalize">{s.level}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{s.target_distance ? <Badge variant="outline">{s.target_distance.toUpperCase()}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-muted-foreground">{s.goal ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost"><Link to="/alunos/$studentId" params={{ studentId: s.id }}>Ver perfil</Link></Button>
                    </TableCell>
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
