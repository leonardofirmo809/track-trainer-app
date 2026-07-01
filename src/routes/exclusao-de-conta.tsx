import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/exclusao-de-conta")({ component: ExclusaoDeConta });

function ExclusaoDeConta() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
          <span className="font-bold text-lg">8020Pace</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Exclusão de Conta</h1>
        <p className="text-muted-foreground mb-8">
          Você tem o direito de solicitar a exclusão da sua conta e de todos os dados associados.
        </p>

        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-3">Como solicitar a exclusão</h2>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-3">
              <li>
                Envie um e-mail para{" "}
                <a
                  href="mailto:privacidade@8020pace.com.br"
                  className="font-medium text-primary hover:underline"
                >
                  privacidade@8020pace.com.br
                </a>{" "}
                com o assunto: <strong>"Solicitação de exclusão de conta"</strong>.
              </li>
              <li>
                Informe o endereço de e-mail vinculado à sua conta.
              </li>
              <li>
                Nossa equipe processará sua solicitação em até <strong>30 dias úteis</strong>.
              </li>
              <li>
                Você receberá uma confirmação por e-mail quando a exclusão for concluída.
              </li>
            </ol>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-2">O que será excluído</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Dados do perfil (nome, e-mail)</li>
              <li>Histórico de treinos e planilhas</li>
              <li>Resultados de testes (3km, FTP)</li>
              <li>Conexão com Strava (tokens serão revogados)</li>
              <li>Dados de uso e sessões</li>
            </ul>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-2">Informações importantes</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>
                A exclusão é <strong>permanente e irreversível</strong>. Não será possível
                recuperar dados após a exclusão.
              </li>
              <li>
                Se você for treinador, a exclusão da sua conta pode impactar os dados dos
                seus alunos vinculados.
              </li>
              <li>
                Dados anonimizados ou agregados podem ser mantidos para fins estatísticos,
                sem identificação pessoal.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-2">Alternativas à exclusão</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Se quiser pausar temporariamente o uso sem excluir sua conta, simplesmente
              pare de utilizar o serviço. Seus dados permanecerão protegidos.
            </p>
            <p className="text-sm text-muted-foreground">
              Para apenas corrigir ou atualizar seus dados, entre em{" "}
              <Link to="/contato" className="text-primary hover:underline">contato conosco</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
