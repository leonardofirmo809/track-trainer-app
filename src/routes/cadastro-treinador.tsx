import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/cadastro-treinador")({ component: CoachSignupPage });

function CoachSignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Informe seu nome completo.");
    if (password.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          signup_type: "coach_application",
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        },
      },
    });
    // Ensure no active session — coach has to wait for approval
    await supabase.auth.signOut();
    setLoading(false);
    if (error) return toast.error(error.message);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <BrandLogo size={40} />
          <span className="font-display text-xl font-bold tracking-tight">
            <span>8020</span><span className="text-[oklch(0.78_0.18_45)]"> Pace</span>
          </span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Cadastre-se como treinador.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">
            Solicite acesso à plataforma. Após análise da nossa equipe, você receberá a liberação para começar a gerenciar seus atletas.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} 8020Pace</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          {submitted ? (
            <>
              <CardHeader>
                <div className="size-12 rounded-full bg-primary/10 grid place-items-center mb-2">
                  <CheckCircle2 className="size-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Solicitação enviada!</CardTitle>
                <CardDescription>
                  Sua conta foi criada e está aguardando aprovação do administrador. Você receberá um e-mail assim que for liberada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full"><Link to="/login">Ir para o login</Link></Button>
                <Button asChild variant="ghost" className="w-full"><Link to="/cadastro">Voltar</Link></Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Criar conta de treinador</CardTitle>
                <CardDescription>Preencha os dados — analisamos sua solicitação em até 24h.</CardDescription>
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
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input id="phone" type="tel" placeholder="(11) 99999-9999" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
                    <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmar senha</Label>
                    <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando…" : "Solicitar cadastro"}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
                  </p>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
