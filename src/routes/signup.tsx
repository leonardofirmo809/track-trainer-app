import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({ component: SignupClosed });

function SignupClosed() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary grid place-items-center"><Activity className="size-5 text-primary-foreground" /></div>
          <span className="font-display text-xl font-bold">PaceLab</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Acesso por convite.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">O PaceLab é exclusivo para treinadores cadastrados. Após a compra, você recebe um link para criar sua conta.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} PaceLab</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Cadastro por convite</CardTitle>
            <CardDescription>Você precisa de um link de convite para criar sua conta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Mail className="size-4 mt-0.5 shrink-0" />
              <p>Após adquirir o sistema, você receberá um e-mail com o link para definir sua senha e ativar a conta.</p>
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link to="/login">Já tenho conta — Entrar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
