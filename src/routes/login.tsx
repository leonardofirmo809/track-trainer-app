import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); return toast.error(error.message); }
    // Role-based redirect
    const uid = signIn.user?.id;
    let dest = "/dashboard";
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const list = (roles ?? []).map((r) => r.role as string);
      if (list.includes("runner")) {
        const { data: prof } = await supabase.from("profiles").select("runner_onboarding_completed").eq("id", uid).maybeSingle();
        dest = prof?.runner_onboarding_completed ? "/corredor" : "/corredor/onboarding";
      }
    }
    setLoading(false);
    toast.success("Bem-vindo de volta!");
    navigate({ to: dest });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary grid place-items-center"><Activity className="size-5 text-primary-foreground" /></div>
          <span className="font-display text-xl font-bold">8020Pace</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Prescrição inteligente para corredores.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">Gerencie seus alunos, registre testes e monte planilhas de 5KM, 10KM, 21KM e 42KM em um só lugar.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} 8020Pace</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription>Acesse sua conta de professor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
              <div className="text-center">
                <Link to="/recuperar-senha" className="text-sm text-primary hover:underline">Esqueci minha senha</Link>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Acesso por convite (treinador). <Link to="/signup" className="text-primary font-medium hover:underline">Saiba mais</Link>
              </p>
              <p className="text-sm text-center pt-2 border-t">
                Ainda não tem conta? <Link to="/cadastro" className="text-primary font-semibold hover:underline">Criar conta</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
