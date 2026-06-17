import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

interface SignupSearch { token?: string }

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): SignupSearch => ({ token: typeof s.token === "string" ? s.token : undefined }),
  beforeLoad: ({ search }) => {
    if (search.token) {
      throw redirect({ to: "/aceitar-convite", search: { token: search.token } });
    }
  },
  component: SignupClosed,
});

function SignupClosed() {
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
          <h1 className="text-4xl font-bold leading-tight">Acesso por convite.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">O 8020Pace é exclusivo para treinadores cadastrados. Após a compra, você recebe um link para criar sua conta.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} 8020Pace</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Cadastro exclusivo para convidados</CardTitle>
            <CardDescription>Solicite um convite ao administrador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Mail className="size-4 mt-0.5 shrink-0" />
              <p>O cadastro é exclusivo para convidados. Após receber seu convite por e-mail, use o link enviado para definir sua senha e ativar a conta.</p>
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
