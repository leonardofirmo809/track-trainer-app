import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/contato")({ component: Contato });

function Contato() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
          <span className="font-bold text-lg">8020Pace</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Contato e Suporte</h1>
        <p className="text-muted-foreground mb-8">
          Precisa de ajuda? Entre em contato conosco pelos canais abaixo.
        </p>

        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-1">Suporte técnico</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Para dúvidas sobre o uso da plataforma, problemas técnicos ou questões sobre
              sua conta.
            </p>
            <a
              href="mailto:suporte@8020pace.com.br"
              className="text-sm font-medium text-primary hover:underline"
            >
              suporte@8020pace.com.br
            </a>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-1">Privacidade e dados</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Para solicitações relacionadas aos seus dados pessoais, consulte nossa{" "}
              <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>{" "}
              ou entre em contato:
            </p>
            <a
              href="mailto:privacidade@8020pace.com.br"
              className="text-sm font-medium text-primary hover:underline"
            >
              privacidade@8020pace.com.br
            </a>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-1">Exclusão de conta</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Para solicitar a exclusão da sua conta e dados, acesse nossa página específica:
            </p>
            <Link
              to="/exclusao-de-conta"
              className="text-sm font-medium text-primary hover:underline"
            >
              Solicitar exclusão de conta →
            </Link>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-1">Links úteis</h2>
            <div className="flex flex-col gap-2 mt-2">
              <Link to="/politica-de-privacidade" className="text-sm text-primary hover:underline">
                Política de Privacidade
              </Link>
              <Link to="/termos-de-uso" className="text-sm text-primary hover:underline">
                Termos de Uso
              </Link>
              <Link to="/exclusao-de-conta" className="text-sm text-primary hover:underline">
                Exclusão de Conta
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
