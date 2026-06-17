import { createFileRoute, Link } from "@tanstack/react-router";
import { User, Trophy, ArrowRight, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/cadastro")({ component: SignupChooser });

function SignupChooser() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <BrandLogo size={36} />
          <span className="font-display text-xl font-bold tracking-tight">
            <span>8020</span><span className="text-[oklch(0.78_0.18_45)]"> Pace</span>
          </span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Crie sua conta no 8020Pace.</h1>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">
            Escolha o seu perfil para começar — corredor com planilha personalizada ou treinador gerenciando alunos.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} 8020Pace</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">Quem é você?</h2>
            <p className="text-sm text-muted-foreground">Selecione o tipo de conta para continuar.</p>
          </div>

          <Card className="hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="size-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                <User className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Sou corredor</CardTitle>
                <CardDescription>Quero minha planilha personalizada</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/cadastro-corredor">
                  Criar conta de corredor <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="size-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                <Trophy className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Sou treinador</CardTitle>
                <CardDescription>Gerencio alunos e prescrevo planilhas</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Mail className="size-4 mt-0.5 shrink-0" />
                <p>O acesso de treinador é por convite. Solicite ao administrador e use o link enviado por e-mail.</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/signup">Tenho um convite</Link>
              </Button>
            </CardContent>
          </Card>

          <p className="text-sm text-center text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
