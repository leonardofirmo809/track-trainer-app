import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({ component: AuditPage });

interface Row {
  id: string;
  event_type: string;
  target_email: string | null;
  actor_id: string | null;
  created_at: string;
}

const LABEL: Record<string, { text: string; variant?: "default" | "secondary" | "outline" | "destructive" }> = {
  invite_created: { text: "Convite criado", variant: "secondary" },
  invite_accepted: { text: "Convite aceito" },
  invite_revoked: { text: "Convite revogado", variant: "destructive" },
  invite_resent: { text: "Convite reenviado", variant: "outline" },
  coach_created_manual: { text: "Conta criada manualmente" },
};

function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, event_type, target_email, actor_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const r = (data ?? []) as Row[];
      setRows(r);
      const ids = Array.from(new Set(r.map((x) => x.actor_id).filter(Boolean) as string[]));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: { id: string; full_name: string | null }) => { map[p.id] = p.full_name ?? "—"; });
        setActors(map);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Auditoria</h1>
        <p className="text-muted-foreground">Histórico de eventos administrativos.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
          <CardDescription>{rows.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Carregando…</p> : rows.length === 0 ? (
            <p className="text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const lbl = LABEL[r.event_type] ?? { text: r.event_type };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell><Badge variant={lbl.variant ?? "default"}>{lbl.text}</Badge></TableCell>
                      <TableCell>{r.target_email ?? "—"}</TableCell>
                      <TableCell>{r.actor_id ? (actors[r.actor_id] ?? "—") : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
