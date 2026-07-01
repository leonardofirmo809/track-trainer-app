import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politica-de-privacidade")({ component: PoliticaDePrivacidade });

function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
          <span className="font-bold text-lg">8020Pace</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Documento provisório. Deve ser revisado por um advogado antes da publicação em lojas de aplicativos.
        </div>

        <h1 className="text-2xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: julho de 2025</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Quem somos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O <strong>8020Pace</strong> é uma plataforma para prescrição de treinos de corrida personalizada,
              acessível em <strong>https://app.8020pace.com.br</strong>. Os dados coletados são utilizados
              exclusivamente para a prestação do serviço de treinamento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Dados coletados</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Nome e endereço de e-mail (cadastro e autenticação)</li>
              <li>Dados de desempenho esportivo (testes, paces, zonas de treinamento)</li>
              <li>Histórico de treinos prescritos</li>
              <li>Dados da conta Strava (se você conectar voluntariamente)</li>
              <li>Informações de uso da plataforma (logs de acesso)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Uso dos dados</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Personalizar e entregar planilhas de treino</li>
              <li>Autenticar e identificar usuários</li>
              <li>Permitir que treinadores acompanhem alunos autorizados</li>
              <li>Melhorar o serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Compartilhamento de dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos nem compartilhamos dados pessoais com terceiros para fins comerciais.
              Os dados são acessados apenas por:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Infraestrutura técnica (Supabase, Cloudflare) para operação do serviço</li>
              <li>O treinador responsável pela conta do aluno</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Armazenamento e segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os dados são armazenados em servidores seguros utilizando a plataforma Supabase,
              com controle de acesso por linha (Row Level Security). Senhas nunca são armazenadas
              em texto puro.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Direitos do usuário</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você tem o direito de acessar, corrigir ou solicitar a exclusão dos seus dados.
              Para exercer esses direitos, consulte nossa página de{" "}
              <Link to="/exclusao-de-conta" className="text-primary hover:underline">
                exclusão de conta
              </Link>
              {" "}ou entre em contato pelo{" "}
              <Link to="/contato" className="text-primary hover:underline">
                formulário de contato
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Cookies e armazenamento local</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos armazenamento local do navegador (localStorage/sessionStorage) para
              manter a sessão autenticada. Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre privacidade, acesse nossa{" "}
              <Link to="/contato" className="text-primary hover:underline">página de contato</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
