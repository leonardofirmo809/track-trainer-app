import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/recuperar-senha")({ component: RecuperarSenhaPage });

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary grid place-items-center"><Activity className="size-5 text-primary-foreground" /></div>
          <span className="font-display text-xl font-bold">8020Pace</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Recuperar acesso.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">Enviamos um link seguro para você redefinir sua senha.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} 8020Pace</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
            <CardDescription>Informe seu e-mail para receber o link de redefinição</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-primary" />
                  <p>Se este e-mail estiver cadastrado, você receberá um link em breve.</p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Voltar para o login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando…" : "Enviar link"}</Button>
                <div className="text-center">
                  <Link to="/login" className="text-sm text-muted-foreground hover:underline">Voltar para o login</Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
