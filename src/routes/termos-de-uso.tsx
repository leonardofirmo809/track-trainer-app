import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos-de-uso")({ component: TermosDeUso });

function TermosDeUso() {
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

        <h1 className="text-2xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: julho de 2025</p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Aceitação dos termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao criar uma conta e utilizar o <strong>8020Pace</strong>, você concorda com estes
              Termos de Uso. Se não concordar, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Descrição do serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O 8020Pace é uma plataforma de prescrição de treinos de corrida que conecta treinadores
              e atletas. O serviço inclui planilhas personalizadas, acompanhamento de desempenho e
              integração com aplicativos de corrida como o Strava.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Elegibilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O serviço é destinado a maiores de 18 anos ou a menores de 18 anos mediante
              autorização e supervisão de um responsável legal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Responsabilidades do usuário</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Manter as credenciais de acesso em segurança</li>
              <li>Fornecer informações verdadeiras no cadastro</li>
              <li>Usar o serviço apenas para fins lícitos</li>
              <li>Não compartilhar acesso com terceiros não autorizados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Aviso médico</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os treinos prescritos na plataforma são elaborados por treinadores físicos e não
              substituem avaliação médica. Consulte um médico antes de iniciar ou intensificar
              qualquer programa de exercícios.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Propriedade intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo da plataforma (marcas, interface, metodologia) pertence ao 8020Pace
              ou aos seus licenciantes. É proibida a reprodução sem autorização.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Limitação de responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O 8020Pace não se responsabiliza por lesões, danos ou perdas decorrentes da
              prática dos treinos. O usuário pratica por conta própria e assume os riscos inerentes
              à atividade física.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Cancelamento e exclusão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você pode solicitar a exclusão da sua conta a qualquer momento. Veja como em nossa
              página de{" "}
              <Link to="/exclusao-de-conta" className="text-primary hover:underline">
                exclusão de conta
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Alterações nos termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar estes termos periodicamente. Notificaremos sobre mudanças
              relevantes por e-mail ou no próprio aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dúvidas sobre os termos? Acesse nossa{" "}
              <Link to="/contato" className="text-primary hover:underline">página de contato</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
