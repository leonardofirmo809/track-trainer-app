# QA — Multiempresa + PWA: Checklist de Execução Manual

**Versão:** 1.0  
**Baseado no plano:** Fase 5 (TC-01 a TC-115)  
**Branch de referência:** `main` — commit `e022552`  
**Ambiente:** https://tanstack-start-app.leonardofirmo809.workers.dev

> **Legenda de status:**
> - `[ ]` Não executado
> - `[P]` Passou
> - `[F]` Falhou
> - `[B]` Bug confirmado — descrever em Observações
> - `[N]` Não aplicável / pulado

> **Prioridade máxima** (executar primeiro, bloquear aprovação se falhar):
> TC-41, TC-44, TC-45, TC-53, TC-54, TC-74..TC-82, TC-84, TC-85, TC-97..TC-100, TC-101..TC-115

---

## PARTE 0 — SETUP MANUAL DOS PERFIS DE TESTE

> Criar tudo manualmente pelo painel do sistema, exatamente como um cliente real faria.
> **Não usar SQL direto, Supabase Admin ou scripts automáticos.**

---

### 0.1 Criação das Empresas

#### Empresa A

1. Login como Admin Global.
2. Acessar `/admin/empresas`.
3. Criar nova empresa:
   - **Nome:** `Empresa QA-A`
   - **Status:** Ativo
4. Anotar o ID gerado: `_______________________________`

#### Empresa B

1. Na mesma tela, criar segunda empresa:
   - **Nome:** `Empresa QA-B`
   - **Status:** Ativo
2. Anotar o ID gerado: `_______________________________`

---

### 0.2 Criação dos Usuários de Teste

> Criar cada usuário pelo fluxo de convite. Isso valida o fluxo real de onboarding.

#### Passo a passo por perfil:

**P-02 — Owner Empresa A** (`owner-a@qa.test`)
1. Em `/admin/treinadores`, criar convite:
   - Nome: `Owner QA-A`
   - Email: `owner-a@qa.test`
   - Empresa: `Empresa QA-A`
2. Copiar o link de convite.
3. Abrir em aba anônima, aceitar o convite (criar senha segura).
4. Ir em `/admin/empresas` → Empresa QA-A → definir role como `owner`.
5. Anotar ID do usuário: `_______________________________`

**P-03 — Admin Empresa A** (`admin-a@qa.test`)
1. Convite igual, email `admin-a@qa.test`, empresa `Empresa QA-A`.
2. Aceitar convite.
3. Definir role como `admin` na empresa.
4. Anotar ID: `_______________________________`

**P-04 — Coach A1** (`coach-a1@qa.test`)
1. Convite com email `coach-a1@qa.test`, empresa `Empresa QA-A`.
2. Aceitar convite.
3. Em membros da empresa, definir:
   - `can_manage_students = true`
   - `can_manage_training = true`
4. Anotar ID: `_______________________________`

**P-05 — Coach A2** (`coach-a2@qa.test`)
1. Convite com email `coach-a2@qa.test`, empresa `Empresa QA-A`.
2. Aceitar convite.
3. Definir:
   - `can_manage_students = false`
   - `can_manage_training = true`
4. Anotar ID: `_______________________________`

**P-06 — Coach A3** (`coach-a3@qa.test`)
1. Convite com email `coach-a3@qa.test`, empresa `Empresa QA-A`.
2. Aceitar convite.
3. Definir:
   - `can_manage_students = false`
   - `can_manage_training = false`
4. Anotar ID: `_______________________________`

**P-07 — Coach B1** (`coach-b1@qa.test`)
1. Convite com email `coach-b1@qa.test`, empresa `Empresa QA-B`.
2. Aceitar convite.
3. Deixar permissões padrão.
4. Anotar ID: `_______________________________`

---

### 0.3 Criação dos Alunos de Teste

> Cada aluno deve ser criado pelo coach responsável para validar o fluxo real.

**Aluno A — vinculado a Coach A1**
1. Login como Coach A1 (`coach-a1@qa.test`).
2. Acessar `/alunos/novo`.
3. Preencher:
   - Nome: `Aluno QA-A`
   - Email: `aluno-a@qa.test`
   - Nível: Intermediário
   - Distância objetivo: 10km
4. Salvar.
5. Anotar ID do aluno: `_______________________________`

**Aluno de Coach A3 — para testes cross-coach**
1. Login como Admin Global (único que pode criar para A3 sem can_manage_students).
   - **Alternativa:** se A3 conseguir criar seu próprio aluno (não deveria), registrar como bug.
   - **Método seguro:** Owner A cria o aluno e atribui a Coach A3.
2. Nome: `Aluno QA-A3`
3. Anotar ID: `_______________________________`

**Aluno B — vinculado a Coach B1**
1. Login como Coach B1 (`coach-b1@qa.test`).
2. Criar aluno normalmente.
3. Nome: `Aluno QA-B`, email: `aluno-b@qa.test`
4. Anotar ID: `_______________________________`

---

### 0.4 Dados de Treinamento Iniciais

> Criar estes dados ANTES de rodar os testes, para que os testes de leitura funcionem.

**Teste 3km do Aluno A:**
1. Login como Coach A1.
2. Acessar perfil do Aluno A → aba Testes.
3. Registrar teste 3km com resultado válido (ex: 15min30s para 3km).
4. Salvar e confirmar que zonas são calculadas.

**Planilha 10km do Aluno A:**
1. Na mesma sessão de Coach A1.
2. Acessar `/planilha-10km?student=<ID_Aluno_A>` (ou pelo perfil do aluno).
3. Selecionar nível e semana inicial.
4. Salvar planilha.
5. Confirmar que planilha aparece no perfil do aluno.

**Planilha do Aluno de A3:**
1. Login como Coach A3.
2. Criar teste e planilha para o próprio aluno.

**Teste e planilha do Aluno B:**
1. Login como Coach B1.
2. Criar teste e planilha do Aluno B.

**Aluno A como runner (P-08):**
1. Admin Global ou Coach A1 devem garantir que `aluno-a@qa.test` tem:
   - role `runner` em `user_roles`
   - perfil de runner criado (onboarding concluído)
2. Verificar se o sistema faz isso automaticamente após o coach criar o aluno.

---

### 0.5 IDs de Referência (preencher durante setup)

| Perfil | Email | ID Usuário | Notas |
|---|---|---|---|
| P-01 Admin Global | _(já existe)_ | | |
| P-02 Owner A | owner-a@qa.test | | |
| P-03 Admin A | admin-a@qa.test | | |
| P-04 Coach A1 | coach-a1@qa.test | | |
| P-05 Coach A2 | coach-a2@qa.test | | |
| P-06 Coach A3 | coach-a3@qa.test | | |
| P-07 Coach B1 | coach-b1@qa.test | | |
| P-08 Aluno A | aluno-a@qa.test | | |
| P-09 Aluno B | aluno-b@qa.test | | |
| Empresa QA-A | — | | |
| Empresa QA-B | — | | |
| Aluno QA-A | — | ID do aluno | |
| Aluno QA-A3 | — | ID do aluno de A3 | |
| Aluno QA-B | — | ID do aluno de B1 | |

---

## PARTE 1 — ADMIN GLOBAL (P-01)

**Sessão:** login como admin global  
**URL base:** `/admin`

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-01 | Login admin | Entrar com credenciais do admin | Redireciona para `/admin` ou dashboard admin | `[ ]` | |
| TC-02 | Lista global de alunos | Acessar `/admin/alunos` | Vê alunos de **todas** as empresas (QA-A e QA-B) | `[ ]` | |
| TC-03 | Lista de treinadores | Acessar `/admin/treinadores` | Todos os coaches criados aparecem | `[ ]` | |
| TC-04 | Convidar coach | Criar convite com empresa | Convite gerado, link copiado para clipboard | `[ ]` | |
| TC-05 | Gestão de usuários | `/admin/usuarios` → toglar role | Role alterada, toast de sucesso | `[ ]` | |
| TC-06 | Auditoria | `/admin/auditoria` | Lista eventos dos passos anteriores | `[ ]` | |
| TC-07 | Configurações | Alterar `max_coaches` | Novo limite salvo, exibido corretamente | `[ ]` | |
| TC-08 | Empresas | `/admin/empresas` | Empresa QA-A e QA-B listadas com membros | `[ ]` | |
| TC-09 | Criar empresa inativa | Criar "Empresa QA-C" status inativo | Empresa aparece com status inativo | `[ ]` | |
| TC-10 | Acessar planilha de qualquer aluno | `/planilha-10km?student=<ID_Aluno_A>` | Planilha carrega, botão Salvar visível | `[ ]` | |
| TC-11 | Logout | Clicar em logout | Redireciona para `/login`, sessão encerrada | `[ ]` | |

---

## PARTE 2 — OWNER EMPRESA A (P-02)

**Sessão:** login como owner-a@qa.test

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-12 | Login owner | Entrar como owner-a@qa.test | Redireciona para dashboard de coach (não admin) | `[ ]` | |
| TC-13 | Admin bloqueado | Tentar acessar `/admin` diretamente | Redirect para dashboard (sem acesso) | `[ ]` | |
| TC-14 | Gestão empresa | Acessar página da empresa (se existir) | Vê membros da Empresa QA-A | `[ ]` | |
| TC-15 | Lista alunos | Acessar `/alunos` | Vê alunos de **todos** os coaches da Empresa A | `[ ]` | |
| TC-16 | Criar aluno | `/alunos/novo` | Aluno criado com sucesso | `[ ]` | |
| TC-17 | Editar cadastro aluno de A3 | Abrir aluno de A3, editar nível | Salvo com sucesso | `[ ]` | |
| TC-18 | Salvar teste — aluno de A3 | Registrar teste 3km para aluno de A3 | Salvo com sucesso (owner = permissão total) | `[ ]` | |
| TC-19 | Salvar planilha — aluno de A3 | Gerar planilha para aluno de A3 | Gerada com sucesso | `[ ]` | |
| TC-20 | Cross-company bloqueado | URL direta para Aluno QA-B | 403 ou "não encontrado" | `[ ]` | |
| TC-21 | Convidar coach | Criar convite com empresa QA-A | Convite com `company_id` da Empresa A | `[ ]` | |

---

## PARTE 3 — ADMIN EMPRESA A (P-03)

**Sessão:** login como admin-a@qa.test

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-22 | Login | Entrar como admin-a@qa.test | Dashboard de coach | `[ ]` | |
| TC-23 | Admin global bloqueado | Acessar `/admin` | Redirect | `[ ]` | |
| TC-24 | Lista alunos | `/alunos` | Vê alunos da Empresa A (todos ou só próprios — **anotar**) | `[ ]` | **Verificar RLS** |
| TC-25 | Criar aluno | `/alunos/novo` | Sucesso se role admin pode criar, senão 403 | `[ ]` | Anotar resultado |
| TC-26 | Salvar teste cross-coach | Teste no aluno de A3 | Esperado: sucesso (role=admin tem acesso) | `[ ]` | |
| TC-27 | Remover membro | Tentar remover membro da empresa | Verificar se admin pode (ou somente owner) | `[ ]` | Comportamento a verificar |

---

## PARTE 4 — COACH A1 (`can_manage_students=true`, `can_manage_training=true`)

**Sessão:** login como coach-a1@qa.test

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-28 | Login | Entrar como coach-a1@qa.test | Dashboard de coach | `[ ]` | |
| TC-29 | Lista alunos próprios | `/alunos` | Aluno QA-A aparece | `[ ]` | |
| TC-30 | Aluno de A3 visível? | Verificar se aluno de A3 aparece na lista | **Anotar comportamento real** (depende de RLS) | `[ ]` | Anotar |
| TC-31 | Criar aluno | `/alunos/novo` | Criado com sucesso, `coach_id=A1` | `[ ]` | |
| TC-32 | Editar próprio aluno | Editar Aluno A | Salvo com sucesso | `[ ]` | |
| TC-33 | Salvar teste — próprio aluno | Registrar teste para Aluno A | Sucesso | `[ ]` | |
| TC-34 | Salvar teste — aluno de A3 | Registrar teste para aluno de A3 | **Sucesso** (can_manage_training=true) | `[ ]` | |
| TC-35 | Salvar planilha — aluno de A3 | Gerar planilha para aluno de A3 | **Sucesso** | `[ ]` | |
| TC-36 | Aluno B bloqueado | URL `/alunos/<ID_Aluno_B>` | 403 ou "não encontrado" | `[ ]` | |
| TC-37 | Admin bloqueado | `/admin` | Redirect | `[ ]` | |

---

## PARTE 5 — COACH A2 (`can_manage_students=false`, `can_manage_training=true`)

**Sessão:** login como coach-a2@qa.test

> ⚠️ **PRIORIDADE MÁXIMA** — TC-41, TC-44, TC-45 são críticos para a Fase 2J.

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-38 | Login | Entrar como coach-a2@qa.test | Dashboard de coach | `[ ]` | |
| TC-39 | Lista alunos | `/alunos` | Apenas próprios alunos visíveis | `[ ]` | |
| TC-40 | Botão "Novo aluno" na UI | Verificar presença do botão/FAB | **Ausente ou desabilitado** | `[ ]` | |
| **TC-41** ⚠️ | **Criar aluno via URL** | **Acessar `/alunos/novo` diretamente** | **403 ou redirect — não deve criar** | `[ ]` | **CRÍTICO** |
| TC-42 | Salvar teste — próprio aluno | Registrar teste do próprio aluno de A2 | Sucesso (coach_id match) | `[ ]` | |
| TC-43 | Salvar planilha — próprio aluno | Planilha do próprio aluno de A2 | Sucesso | `[ ]` | |
| **TC-44** ⚠️ | **Salvar teste — aluno de A3** | **Registrar teste para aluno de A3** | **Sucesso** (can_manage_training=true, Fase 2J) | `[ ]` | **CRÍTICO — valida Fase 2J** |
| **TC-45** ⚠️ | **Salvar planilha — aluno de A3** | **Gerar planilha para aluno de A3** | **Sucesso** (mesmo motivo) | `[ ]` | **CRÍTICO — valida Fase 2J** |
| TC-46 | Editar cadastro aluno de A3 | Tentar editar nome/nível do aluno de A3 | **403** (sem can_manage_students) | `[ ]` | |
| TC-47 | Aluno B bloqueado | URL direta para Aluno QA-B | 403 ou "não encontrado" | `[ ]` | |

---

## PARTE 6 — COACH A3 (`can_manage_students=false`, `can_manage_training=false`)

**Sessão:** login como coach-a3@qa.test

> ⚠️ **PRIORIDADE MÁXIMA** — TC-53 e TC-54 validam o bloqueio correto.

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-48 | Login | Entrar como coach-a3@qa.test | Dashboard de coach | `[ ]` | |
| TC-49 | Lista alunos | `/alunos` | Apenas aluno QA-A3 visível | `[ ]` | |
| TC-50 | Criar aluno bloqueado | `/alunos/novo` | **403 ou redirect** | `[ ]` | |
| TC-51 | Salvar teste — próprio aluno | Teste do aluno de A3 | **Sucesso** (coach_id match) | `[ ]` | |
| TC-52 | Salvar planilha — próprio aluno | Planilha do aluno de A3 | **Sucesso** | `[ ]` | |
| **TC-53** ⚠️ | **Salvar teste — Aluno A (de A1)** | **URL direta, tentar registrar teste para Aluno A** | **403 — sem permissão** | `[ ]` | **CRÍTICO** |
| **TC-54** ⚠️ | **Salvar planilha — Aluno A** | **URL direta, tentar salvar planilha do Aluno A** | **403 — sem permissão** | `[ ]` | **CRÍTICO** |
| TC-55 | Empresa B bloqueada | URL direta para qualquer aluno de B | 403 ou "não encontrado" | `[ ]` | |

---

## PARTE 7 — COACH B1 (Empresa B)

**Sessão:** login como coach-b1@qa.test

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-56 | Login | Entrar como coach-b1@qa.test | Dashboard de coach | `[ ]` | |
| TC-57 | Lista alunos | `/alunos` | Apenas Aluno QA-B visível | `[ ]` | |
| TC-58 | Aluno A nunca aparece | Verificar lista e busca | **Aluno A e alunos de A nunca listados** | `[ ]` | |
| TC-59 | URL direta Aluno A | `/alunos/<ID_Aluno_A>` | 404 ou "não encontrado" | `[ ]` | |
| TC-60 | Planilha Aluno A bloqueada | `/planilha-10km?student=<ID_Aluno_A>` | 403 | `[ ]` | |
| TC-61 | Teste Aluno A bloqueado | POST salvar teste com studentId de Aluno A | 403 | `[ ]` | |
| TC-62 | Salvar teste Aluno B | Fluxo normal | Sucesso | `[ ]` | |
| TC-63 | Salvar planilha Aluno B | Fluxo normal | Sucesso | `[ ]` | |

---

## PARTE 8 — RUNNER / ALUNO A (P-08)

**Sessão:** login como aluno-a@qa.test (role runner)

| TC | Descrição | Passos resumidos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-65 | Login | Entrar como aluno-a@qa.test | Redireciona para `/corredor` | `[ ]` | |
| TC-66 | Dashboard do corredor | Cards de hoje, semana, plano atual | Dados do Aluno A exibidos corretamente | `[ ]` | |
| TC-67 | Planilha | `/corredor/planilha` ou link no dashboard | Planilha 10km do Aluno A | `[ ]` | |
| TC-68 | Avaliação | `/corredor/avaliacao` | Teste 3km mais recente e zonas exibidos | `[ ]` | |
| TC-69 | Admin bloqueado | Tentar `/admin` | Redirect | `[ ]` | |
| TC-70 | Tela de coach bloqueada | Tentar `/alunos` | Redirect ou 403 | `[ ]` | |
| TC-71 | Dados Aluno B bloqueados | URL com student_id do Aluno B | 403 ou "não encontrado" | `[ ]` | |
| TC-72 | Onboarding | `/corredor/onboarding` | Fluxo acessível | `[ ]` | |
| TC-73 | Nova planilha | `/corredor/planilha/nova` | Tela de confirmação, botão "Continuar" funcional | `[ ]` | |

---

## PARTE 9 — ISOLAMENTO CROSS-COMPANY

> ⚠️ **TODOS CRÍTICOS** — falha em qualquer um = bloqueio de aprovação.

Preparação: ter em mãos os IDs de Aluno A e Aluno B anotados no setup.

| TC | Atacante | Alvo | Ação | Esperado | Status | Observações |
|---|---|---|---|---|---|---|
| **TC-74** ⚠️ | Coach A1 | Aluno B | `/alunos/<ID_Aluno_B>` | 404 / "não encontrado" | `[ ]` | |
| **TC-75** ⚠️ | Coach A1 | Aluno B | Salvar teste via DevTools (student_id=Aluno B) | 403 | `[ ]` | |
| **TC-76** ⚠️ | Coach A1 | Aluno B | `/planilha-10km?student=<ID_Aluno_B>` | 403 | `[ ]` | |
| **TC-77** ⚠️ | Coach B1 | Aluno A | `/alunos/<ID_Aluno_A>` | 404 / "não encontrado" | `[ ]` | |
| **TC-78** ⚠️ | Coach B1 | Aluno A | Qualquer server function com studentId de A | 403 | `[ ]` | |
| **TC-79** ⚠️ | Aluno A | Aluno B | URL com student_id de Aluno B, sessão de A | 403 | `[ ]` | |
| **TC-80** ⚠️ | Owner A | Aluno B | `/alunos/<ID_Aluno_B>` | 403 | `[ ]` | |
| **TC-81** ⚠️ | Owner A | Empresa B | Server function com dados da Empresa B | 403 | `[ ]` | |
| **TC-82** ⚠️ | Admin A | Empresa B | Qualquer acesso a dados da Empresa B | 403 | `[ ]` | |

**Como executar TC-75, TC-78:** abrir DevTools → Network → copiar a chamada de "salvar teste" de um aluno próprio → modificar o `studentId` no payload para o ID do aluno da outra empresa → reenviar. O servidor deve retornar 403.

---

## PARTE 10 — EMPRESA INATIVA

> ⚠️ TC-84 e TC-85 são críticos.

**Preparação:** inativar Empresa QA-A no painel `/admin/empresas`. Manter Empresa QA-B ativa.

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-83 | Inativar Empresa A | Admin → `/admin/empresas` → inativar Empresa QA-A | Status muda para inativo | `[ ]` | |
| **TC-84** ⚠️ | Coach A1 cria aluno | Login como A1, tentar criar novo aluno | **403 — empresa inativa** | `[ ]` | **CRÍTICO** |
| **TC-85** ⚠️ | Coach A1 salva treino | Login como A1, tentar salvar treino de aluno existente | **Verificar — pode bloquear** | `[ ]` | **CRÍTICO — anotar resultado** |
| TC-86 | Owner A visualiza dados | Login como Owner A, acessar `/alunos` | Verificar se histórico ainda é visível | `[ ]` | |
| TC-87 | Reativar Empresa A | Admin reativa Empresa QA-A | Operações voltam ao normal (validar com TC-31 novamente) | `[ ]` | |

---

## PARTE 11 — CONVITES

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-88 | Convite com empresa | Admin cria convite com Empresa QA-A | Campo `company_id` propagado | `[ ]` | |
| TC-89 | Coach aceita convite | Aceitar convite pelo link | Coach adicionado à Empresa QA-A automaticamente | `[ ]` | |
| TC-90 | Coach recém-aceito | Acessar `/alunos` | Comportamento conforme permissões | `[ ]` | |
| TC-91 | Convite sem empresa | Criar convite sem empresa | Coach criado sem empresa | `[ ]` | |
| TC-92 | Convite revogado | Revogar convite, tentar aceitar | Erro claro: "convite inválido ou expirado" | `[ ]` | |
| TC-93 | Convite expirado | Simular (ou aguardar 7 dias) | Erro ao tentar aceitar | `[ ]` | Pode pular em QA ágil |

---

## PARTE 12 — LIMITE DE COACHES

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-94 | Definir max_coaches=1 | `/admin/configuracoes`, salvar limite 1 | Configuração salva | `[ ]` | |
| TC-95 | Tentar convidar com limite atingido | Ir em `/admin/treinadores` | Botão desabilitado, tooltip "Limite atingido" | `[ ]` | |
| TC-96 | Aumentar limite | Voltar para valor anterior | Botão habilitado novamente | `[ ]` | |

---

## PARTE 13 — LOGOUT / RE-LOGIN

> ⚠️ TC-97 a TC-100 são críticos para segurança de sessão.

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| **TC-97** ⚠️ | Troca de sessão A1 → B1 | Logout como A1, login como B1 | Sessão completamente trocada, **zero dados de A1 visíveis** | `[ ]` | |
| **TC-98** ⚠️ | Troca de sessão Owner → Aluno A | Logout como Owner A, login como Aluno A | Interface muda para tela de corredor | `[ ]` | |
| **TC-99** ⚠️ | Sessão expirada | Limpar token do localStorage (DevTools → Application → Storage → Clear) | Redirect para `/login` ao tentar navegar | `[ ]` | |
| **TC-100** ⚠️ | Duas sessões paralelas | Aba normal: Coach A1 / Aba anônima: Coach B1 | Cada aba acessa **apenas seus dados** sem interferência | `[ ]` | |

---

## PARTE 14 — PWA (Mobile e Desktop)

> ⚠️ **TODOS CRÍTICOS** — TC-101 a TC-115.

### 14.1 Verificação técnica (antes de testar em dispositivo)

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| TC-113 | Manifest no DevTools | Chrome → DevTools → Application → Manifest | Todos os campos exibidos, sem erros | `[ ]` | |
| TC-114 | Ícones carregáveis | Na aba Manifest → Icons | Todos os 4 ícones listados e visualizáveis | `[ ]` | |
| TC-115 | Lighthouse PWA | DevTools → Lighthouse → PWA (modo mobile) | Installability ✅, sem bloqueios críticos | `[ ]` | Score parcial esperado sem SW |

### 14.2 Instalação — Android Chrome

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| **TC-101** ⚠️ | Prompt de instalação | Acessar o app no Chrome Android, usar por ~30s | Mini-infobar ou botão "Adicionar à tela inicial" aparece | `[ ]` | |
| **TC-102** ⚠️ | Instalar app | Confirmar instalação pelo prompt | Ícone navy "8020Pace" na home screen | `[ ]` | |

### 14.3 Instalação — iOS Safari

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| **TC-103** ⚠️ | Instalar via Safari | Menu compartilhar → "Adicionar à tela de início" | Ícone "8020Pace" adicionado com nome correto | `[ ]` | |

### 14.4 Instalação — Desktop Chrome

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| **TC-104** ⚠️ | Ícone na barra de endereço | Acessar o app no Chrome desktop | Ícone de instalação (⊕) aparece na barra | `[ ]` | |

### 14.5 Comportamento instalado

| TC | Ação | Passos | Esperado | Status | Observações |
|---|---|---|---|---|---|
| **TC-105** ⚠️ | Modo standalone Android | Abrir app instalado | Sem barra de endereço, modo fullscreen | `[ ]` | |
| **TC-106** ⚠️ | Status bar iOS | Abrir no iOS instalado | Status bar `default` (clara, ícones escuros) | `[ ]` | |
| **TC-107** ⚠️ | Navegação no standalone | Navegar entre telas | Funciona normalmente sem barra browser | `[ ]` | |
| **TC-108** ⚠️ | Login no standalone | Fazer login pelo app instalado | Login funciona, sessão persiste | `[ ]` | |
| **TC-109** ⚠️ | Bottom nav no standalone | Verificar nav inferior após login | Ícones de coach ou runner aparecem corretamente | `[ ]` | |
| **TC-110** ⚠️ | Rotação de tela | Girar dispositivo | `orientation: portrait-primary` — verificar comportamento | `[ ]` | |
| **TC-111** ⚠️ | Botão voltar Android | Usar botão de voltar do sistema | Navega pelo histórico do app | `[ ]` | |
| **TC-112** ⚠️ | Offline (sem SW) | Desconectar internet, tentar usar | Erro de rede — **não deve exibir cache de dados autenticados** | `[ ]` | Confirmar que **não** há cache perigoso |

---

## PARTE 15 — RESUMO FINAL E APROVAÇÃO

### Contagem por resultado

| Resultado | Quantidade | TCs |
|---|---|---|
| `[P]` Passou | | |
| `[F]` Falhou | | |
| `[B]` Bug confirmado | | |
| `[N]` Pulado | | |

### Bugs registrados

| Bug # | TC | Descrição | Severidade | Reprodução |
|---|---|---|---|---|
| B-01 | | | Alta / Média / Baixa | |
| B-02 | | | | |
| B-03 | | | | |

### Checklist de aprovação para primeiro cliente real

#### Segurança e Isolamento
- [ ] Nenhum coach da Empresa A acessa dados da Empresa B (TC-74..82) — todos `[P]`
- [ ] Nenhum runner acessa dados de outro runner (TC-79) — `[P]`
- [ ] Admin de empresa não tem acesso global de sistema (TC-13, TC-23) — `[P]`
- [ ] Empresa inativa bloqueia criação de aluno (TC-84) — `[P]`
- [ ] Convite revogado não funciona (TC-92) — `[P]`
- [ ] `can_manage_students=false` impede criação de aluno (TC-41, TC-50) — `[P]`
- [ ] `can_manage_training=false` impede salvar treino de outros coaches (TC-53, TC-54) — `[P]`
- [ ] `can_manage_training=true` permite salvar treino cross-coach dentro da empresa (TC-44, TC-45) — `[P]` ← Fase 2J

#### Fluxo Principal Coach
- [ ] Criar conta via convite funciona end-to-end
- [ ] Criar aluno com sucesso
- [ ] Salvar teste 3km do aluno
- [ ] Gerar planilha com zonas corretas
- [ ] Logout e re-login restauram estado correto (TC-97, TC-98)

#### Fluxo Principal Runner
- [ ] Login como runner redireciona para `/corredor` (TC-65)
- [ ] Dashboard exibe treino do dia (TC-66)
- [ ] Avaliação mostra zonas (TC-68)
- [ ] Telas de coach inacessíveis (TC-70)

#### Admin Global
- [ ] Convidar coach, coach aceita, aparece na lista
- [ ] Limite de coaches funciona (TC-95)
- [ ] Auditoria registra eventos (TC-06)

#### Mobile / PWA
- [ ] App instalável no Android Chrome (TC-101, TC-102)
- [ ] App instalável no iOS Safari (TC-103)
- [ ] Modo standalone sem barra de endereço (TC-105)
- [ ] Bottom nav no app instalado (TC-109)
- [ ] Sem cache perigoso offline (TC-112)

### Decisão final

```
Data do QA: _______________
Executado por: _______________

[ ] APROVADO — todos os itens críticos [P], sem bugs de alta severidade
[ ] REPROVADO — um ou mais itens críticos [F] ou [B] de alta severidade

Observações gerais:
_______________________________________________
_______________________________________________
```

---

*Gerado em: 2026-06-28 — Branch main@e022552*  
*Não alterar este arquivo durante a execução do QA. Usar cópia ou marcar diretamente.*
