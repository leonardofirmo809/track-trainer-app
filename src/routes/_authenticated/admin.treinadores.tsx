import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { createCoachAccount } from "@/lib/admin-coaches.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/treinadores")({ component: AdminCoachesPage });

interface Invite {
  id: string;
  email: string;
  full_name: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  created_at: string;
}

interface Profile { id: string; full_name: string | null; created_at: string }

function generateToken() {
  const a = crypto.randomUUID().replace(/-/g, "");
  const b = crypto.randomUUID().replace(/-/g, "");
  return `${a}${b}`;
}

function AdminCoachesPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  // Manual create
  const createCoach = useServerFn(createCoachAccount);
  const [openManual, setOpenManual] = useState(false);
  const [mName, setMName] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mPass, setMPass] = useState("");
  const [mConfirm, setMConfirm] = useState("");
  const [mCreating, setMCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: inv }, { data: roleRows }] = await Promise.all([
      supabase.from("coach_invites").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "coach"),
    ]);
    setInvites((inv ?? []) as Invite[]);
    const ids = ((roleRows ?? []) as { user_id: string }[]).map((r) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, created_at").in("id", ids);
      setCoaches((profs ?? []) as Profile[]);
    } else setCoaches([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const inviteLink = (token: string) => `${window.location.origin}/aceitar-convite?token=${token}`;

  const createInvite = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Preencha nome e e-mail.");
    setCreating(true);
    const token = generateToken();
    const { data, error } = await supabase.from("coach_invites").insert({
      email: email.trim().toLowerCase(),
      full_name: name.trim(),
      token,
      invited_by: user?.id,
    }).select().single();
    setCreating(false);
    if (error) return toast.error(error.message);
    await navigator.clipboard.writeText(inviteLink((data as Invite).token)).catch(() => {});
    toast.success("Convite criado! Link copiado para a área de transferência.");
    setName(""); setEmail(""); setOpen(false);
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("coach_invites").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Convite revogado.");
    load();
  };

  const resend = async (inv: Invite) => {
    const newToken = generateToken();
    const { error } = await supabase.from("coach_invites").update({
      token: newToken,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_at: null,
    }).eq("id", inv.id);
    if (error) return toast.error(error.message);
    await navigator.clipboard.writeText(inviteLink(newToken)).catch(() => {});
    toast.success("Novo link gerado e copiado.");
    load();
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
      const msg = e instanceof Error ? e.message : "Erro ao criar conta";
      toast.error(msg);
    } finally {
      setMCreating(false);
    }
  };

  const statusBadge = (s: Invite["status"]) => {
    if (s === "pending") return <Badge variant="secondary">Pendente</Badge>;
    if (s === "accepted") return <Badge>Aceito</Badge>;
    return <Badge variant="outline">Revogado</Badge>;
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Treinadores</h1>
          <p className="text-muted-foreground">Convide novos treinadores e gerencie acessos.</p>
        </div>
        <div className="flex gap-2">
        <Dialog open={openManual} onOpenChange={setOpenManual}>
          <DialogTrigger asChild>
            <Button variant="outline"><KeyRound className="size-4 mr-2" /> Criar conta manual</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar conta manual</DialogTitle>
              <DialogDescription>Defina nome, e-mail e senha do treinador. A conta fica ativa imediatamente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mname">Nome completo</Label>
                <Input id="mname" value={mName} onChange={(e) => setMName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memail">Email</Label>
                <Input id="memail" type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mpass">Senha (mín. 8 caracteres)</Label>
                <Input id="mpass" type="password" value={mPass} onChange={(e) => setMPass(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mconfirm">Confirmar senha</Label>
                <Input id="mconfirm" type="password" value={mConfirm} onChange={(e) => setMConfirm(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenManual(false)}>Cancelar</Button>
              <Button onClick={submitManual} disabled={mCreating}><Plus className="size-4 mr-2" />{mCreating ? "Criando…" : "Criar conta"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="size-4 mr-2" /> Convidar treinador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar treinador</DialogTitle>
              <DialogDescription>O convite gera um link válido por 7 dias.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="iname">Nome completo</Label>
                <Input id="iname" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iemail">Email</Label>
                <Input id="iemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createInvite} disabled={creating}><Plus className="size-4 mr-2" />{creating ? "Criando…" : "Criar convite"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Convites</CardTitle>
          <CardDescription>Pendentes, aceitos e revogados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Carregando…</p> : invites.length === 0 ? (
            <p className="text-muted-foreground">Nenhum convite ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
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
                    <TableCell>{statusBadge(i.status)}</TableCell>
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
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treinadores ativos</CardTitle>
          <CardDescription>{coaches.length} cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {coaches.length === 0 ? <p className="text-muted-foreground">Nenhum treinador ativo.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
