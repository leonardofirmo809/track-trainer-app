
# Status de isolamento entre treinadores

## TL;DR
Sim, o isolamento entre treinadores **está implementado e ativo** no banco. Cada treinador só enxerga os próprios alunos, testes e planilhas — garantido por Row Level Security (RLS) no banco, não apenas no frontend (o que é o padrão correto). Há, porém, **3 pontos operacionais** que você precisa decidir antes de liberar o novo treinador, e **1 verificação** que recomendo fazer em produção.

---

## O que já está garantido

### Separação de papéis
- Existem 3 papéis: `admin`, `coach`, `runner`, armazenados em tabela própria (`user_roles`) — não dá para um usuário "se autopromover" a admin pelo frontend.
- Função `has_role()` é `security definer` (padrão correto, sem recursão de policy).

### Isolamento por treinador (RLS ativo)
- **students**: cada treinador só lê/edita/apaga linhas onde `coach_id = seu próprio id`.
- **tests**: idem — `coach_id = auth.uid()`.
- **training_plans**: idem.
- **profiles**: cada usuário só vê o próprio perfil.
- **Admin** enxerga tudo (correto para suporte).
- **Runner** (corredor self-service) só vê o próprio aluno/testes/planos.

Ou seja: mesmo que o novo treinador descubra o ID de um aluno de outro treinador e tente puxar via API, o Postgres bloqueia.

### Cadastro controlado
- Treinador novo só consegue criar conta via **convite** (`coach_invites`) emitido por admin — signup aberto está bloqueado no trigger `handle_new_user`.
- Existe um **teto de treinadores** configurável (`app_settings.max_coaches`, hoje = **4**).
- Corredor self-service usa fluxo separado (`signup_type = 'runner'`) e nunca recebe papel de coach.

### Auditoria
- Tabela `admin_audit_log` registra criação/revogação/aceite de convites.

---

## O que precisa de decisão sua antes de liberar o cliente novo

1. **Aumentar `max_coaches`?** Hoje está em 4. Se o novo treinador é o 4º, ele entra; se for o 5º, o cadastro vai falhar com "Limite de treinadores atingido".
2. **Convite já foi enviado?** O fluxo exige: admin entra no painel → cria convite com o e-mail dele → ele recebe o link → cria a conta. Sem isso, o signup é recusado.
3. **Branding/white-label do novo treinador**: o bucket `coach-branding` é público (logos). Se ele subir logo, fica visível por URL — ok para logo, mas confirme que é esse o comportamento esperado.

## O que recomendo verificar (rápido) antes de entregar

- **Teste de fumaça de isolamento em produção** (15 min): logar como o novo treinador, confirmar que listagens de alunos/testes/planilhas voltam vazias, criar 1 aluno-teste, e logar como você (outro treinador) para confirmar que esse aluno **não aparece**. RLS está certo no código, mas vale o teste real com o ambiente publicado.
- **Recuperação de senha**: confirmar que o e-mail de "esqueci a senha" está chegando (config de e-mail do auth) — é o tipo de coisa que só descobre quando o cliente precisa.

## Fora do escopo desta auditoria
Não cobri: cobrança/billing, limites de uso por treinador, retenção/exclusão de dados quando um treinador sai, exportação LGPD. Se algum desses for crítico para essa venda, me diga e eu planejo separado.

---

**Quer que eu prossiga com algo?** Por exemplo: (a) aumentar o `max_coaches`, (b) gerar o convite do novo treinador, (c) montar um checklist executável de teste de isolamento em produção, ou (d) só confirmar e seguir.
