import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { StudentCreateModal } from "@/components/student-create-modal";
import { StudentMobileCard } from "@/components/student-mobile-card";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alunos/")({ component: AlunosList });

const LEVEL_LABEL: Record<string, string> = { iniciante: "Nível 1", intermediario: "Nível 2", avancado: "Avançado" };

function fmtRel(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

function AlunosList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const studentsQ = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, email, target_distance, level, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lastQ = useQuery({
    queryKey: ["students-last-test"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_students_last_activity");
      if (error) throw error;
      const map = new Map<string, string>();
      for (const r of (data ?? []) as { student_id: string; last_test_at: string }[]) {
        map.set(r.student_id, r.last_test_at);
      }
      return map;
    },
  });

  const { pull, refreshing, triggered } = usePullToRefresh(async () => {
    await Promise.all([studentsQ.refetch(), lastQ.refetch()]);
  });

  const all = studentsQ.data ?? [];
  const filtered = useMemo(
    () => all.filter((s) => !q || s.full_name.toLowerCase().includes(q.toLowerCase())),
    [all, q],
  );

  const remove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    const { error } = await supabase.from("students").delete().eq("id", removeTarget.id);
    setRemoving(false);
    if (error) return toast.error(error.message);
    toast.success("Aluno removido.");
    setRemoveTarget(null);
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Pull-to-refresh indicator */}
      <div
        className="md:hidden flex items-center justify-center overflow-hidden text-muted-foreground"
        style={{ height: pull, transition: refreshing ? "none" : "height .15s" }}
      >
        <RefreshCw className={cn("size-5", (refreshing || triggered) && "animate-spin text-primary")} />
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Meus Alunos <span className="text-muted-foreground font-normal">({all.length})</span>
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie os corredores que você acompanha</p>
        </div>
        <Button className="hidden md:inline-flex" onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" /> Novo aluno
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {studentsQ.isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Carregando…</p>
      ) : all.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto size-16 rounded-full bg-accent grid place-items-center mb-4">
              <Users className="size-8 text-primary" />
            </div>
            <p className="font-semibold text-lg">Nenhum aluno cadastrado ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Comece cadastrando seu primeiro corredor</p>
            <Button className="mt-5" onClick={() => setOpen(true)}><Plus className="size-4 mr-2" />Cadastrar aluno</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground">Nenhum aluno encontrado para "{q}".</p>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Última atividade</TableHead>
                    <TableHead className="text-right w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const initials = s.full_name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
                    const last = lastQ.data?.get(s.id) ?? null;
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => navigate({ to: "/alunos/$studentId", params: { studentId: s.id } })}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9"><AvatarFallback>{initials || "?"}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                              <p className="font-medium">{s.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{s.email ?? "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.target_distance ? <Badge variant="outline">{s.target_distance.toUpperCase()}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {s.level ? <Badge variant="secondary">{LEVEL_LABEL[s.level] ?? s.level}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{fmtRel(last)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => navigate({ to: "/alunos/$studentId", params: { studentId: s.id } })}
                            aria-label="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setRemoveTarget({ id: s.id, name: s.full_name })}
                            aria-label="Remover"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((s) => (
              <StudentMobileCard
                key={s.id}
                s={{
                  id: s.id,
                  full_name: s.full_name,
                  programa: s.target_distance ? s.target_distance.toUpperCase() : null,
                  nivel: s.level ? (LEVEL_LABEL[s.level] ?? s.level) : null,
                }}
                onRemove={() => setRemoveTarget({ id: s.id, name: s.full_name })}
              />
            ))}
          </div>
        </>
      )}

      {/* Mobile FAB */}
      <Button
        size="icon"
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 size-14 rounded-full shadow-lg"
        aria-label="Novo aluno"
      >
        <Plus className="size-6" />
      </Button>

      <StudentCreateModal open={open} onOpenChange={setOpen} />

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados de <strong>{removeTarget?.name}</strong> serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
