import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvite } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";

interface InviteSearch { token?: string }

export const Route = createFileRoute("/aceitar-convite")({
  validateSearch: (s: Record<string, unknown>): InviteSearch => ({ token: typeof s.token === "string" ? s.token : undefined }),
  component: AcceptInvitePage,
});

interface InviteInfo { email: string; full_name: string; status: string; expires_at: string }

function AcceptInvitePage() {
  const { token } = useSearch({ from: "/aceitar-convite" });
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError("Link inválido."); setLoading(false); return; }
    supabase.rpc("get_invite_by_token", { _token: token }).then(({ data, error }) => {
      if (error) { setError(error.message); setLoading(false); return; }
      const row = (data as InviteInfo[] | null)?.[0];
      if (!row) { setError("Convite não encontrado."); setLoading(false); return; }
      if (row.status !== "pending") { setError("Este convite já foi utilizado ou cancelado."); setLoading(false); return; }
      if (new Date(row.expires_at) < new Date()) { setError("Este convite expirou."); setLoading(false); return; }
      setInvite(row);
      setLoading(false);
    });
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (password.length < 8) return toast.error("Senha deve ter ao menos 8 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    if (!token) return;
    setSubmitting(true);
    try {
      await acceptInvite({ data: { token, password } });
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInErr) {
        toast.success("Conta criada! Faça login para continuar.");
        navigate({ to: "/login" });
        return;
      }
      toast.success("Conta criada! Bem-vindo.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Response ? await err.text() : err instanceof Error ? err.message : "Erro ao criar conta.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary grid place-items-center"><Activity className="size-5 text-primary-foreground" /></div>
          <span className="font-display text-xl font-bold">8020Pace</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Você foi convidado.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">Defina sua senha para começar a prescrever treinos.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} 8020Pace</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Ativar conta</CardTitle>
            <CardDescription>Defina sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Validando convite…</div>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-sm text-destructive">{error}</p>
                <Link to="/login" className="text-sm text-primary hover:underline">Ir para o login</Link>
              </div>
            ) : invite ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={invite.full_name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={invite.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Criando…" : "Ativar conta"}</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
