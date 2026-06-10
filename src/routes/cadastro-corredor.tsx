import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/cadastro-corredor")({ component: RunnerSignupPage });

function RunnerSignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { signup_type: "runner", full_name: fullName },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }

    // Try immediate sign-in (works when email confirmation is disabled)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      toast.success("Conta criada! Verifique seu email para confirmar e faça login.");
      navigate({ to: "/login" });
      return;
    }
    toast.success("Conta criada! Vamos montar sua planilha.");
    navigate({ to: "/corredor/onboarding" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary grid place-items-center"><Activity className="size-5 text-primary-foreground" /></div>
          <span className="font-display text-xl font-bold">8020Pace</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Sua planilha de corrida, do seu jeito.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">
            Avaliação, paces personalizados e plano completo de 20 semanas para 10km, 21km ou 42km.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} 8020Pace</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Criar conta de corredor</CardTitle>
            <CardDescription>Comece em menos de 1 minuto.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando…" : "Criar minha conta"}</Button>
              <p className="text-sm text-center text-muted-foreground">
                Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
