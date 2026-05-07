## Visão Geral

Sistema web para professores de corrida prescreverem treinos. Nesta primeira fase, foco em estrutura: autenticação, banco de dados, navegação e telas vazias/visuais — sem lógica de cálculo de planilhas.

## Stack

- TanStack Start (já configurado) + Tailwind + shadcn/ui
- Lovable Cloud (Supabase) para auth e banco
- Sidebar shadcn com navegação por rotas

## Banco de Dados (Lovable Cloud)

Tabelas com RLS para que cada professor veja apenas seus dados:

- `profiles` — dados do professor (id → auth.users, nome, email, avatar)
- `students` — alunos (id, coach_id → profiles, nome, email, telefone, data_nascimento, sexo, objetivo, nivel [iniciante/intermediário/avançado], distancia_alvo [5/10/21/42], historico_lesoes, observacoes, created_at)
- `tests` — histórico de testes (id, student_id, tipo [ex: 3km], data, tempo, pace, observacoes, created_at) — sem cálculos por enquanto
- `training_plans` — planilhas geradas (id, student_id, tipo [5km/10km/21km/42km], data_inicio, data_fim, status, payload jsonb vazio por ora, created_at)

Trigger: criar `profiles` automaticamente ao registrar usuário.
RLS: todas as tabelas filtradas por `coach_id = auth.uid()` (direta ou via join em student).

## Autenticação

- Email + senha (auto-confirm para facilitar testes)
- Páginas: `/login`, `/signup`
- Layout `_authenticated` protegendo rotas internas
- Logout no header

## Estrutura de Rotas

```
src/routes/
  index.tsx                          → redireciona para /dashboard ou /login
  login.tsx
  signup.tsx
  _authenticated.tsx                 → guard + layout com Sidebar
  _authenticated/
    dashboard.tsx                    → cards-resumo (nº alunos, testes recentes, planilhas ativas)
    alunos.index.tsx                 → lista + filtros (nome, nível, distância) + botão "Novo aluno"
    alunos.novo.tsx                  → formulário de cadastro
    alunos.$studentId.tsx            → perfil do aluno com abas
    teste-3km.tsx                    → área Teste de 3KM (placeholder)
    planilha-5km.tsx                 → placeholder
    planilha-10km.tsx                → placeholder
    planilha-21km.tsx                → placeholder
    planilha-42km.tsx                → placeholder
```

## Layout Visual

- **Sidebar fixa esquerda** (shadcn `Sidebar`, collapsible icon):
  - Dashboard
  - Alunos
  - Separador "Prescrição"
  - Teste de 3KM
  - Planilha 5KM / 10KM / 21KM / 42KM
  - Rodapé: avatar + nome do professor + logout
- **Header** com `SidebarTrigger`, breadcrumb e perfil
- **Dashboard**: 4 cards de métricas + tabela "Alunos recentes" + tabela "Últimos testes"
- **Lista de alunos**: tabela com avatar, nome, nível (badge), distância-alvo, último teste, ações (ver / editar)
- **Perfil do aluno** com abas (`Tabs` do shadcn):
  1. Dados Pessoais
  2. Objetivo & Nível
  3. Histórico de Lesões
  4. Observações
  5. Histórico de Testes (tabela)
  6. Histórico de Planilhas (tabela)
- **Telas de Planilha (5/10/21/42 KM e Teste 3KM)**: placeholder elegante com card "Em breve — regras de prescrição serão adicionadas aqui", com seletor de aluno já visível para preparar o fluxo.

## Design

- Tema claro e moderno, paleta neutra com accent vibrante (verde-esporte / azul-performance) — definida em `src/styles.css` via tokens oklch
- Tipografia: par display + sans (ex: Sora + Inter alternativo) carregada via Google Fonts
- Cards com sombra sutil, badges para nível/distância, tabelas densas mas legíveis
- Estados vazios ilustrados ("Nenhum aluno cadastrado ainda")

## Fora de Escopo (próximas etapas)

- Cálculos de pace, zonas, progressão semanal
- Geração automática de planilhas
- Exportação PDF, notificações, app do aluno

## Entregáveis desta fase

1. Lovable Cloud habilitado + tabelas + RLS + trigger
2. Auth completo (login/signup/logout/guard)
3. Sidebar + layout autenticado
4. CRUD de alunos (criar, listar, ver perfil) — edição/remoção podem vir junto se couber
5. Telas de perfil com abas e tabelas vazias prontas
6. Placeholders das 5 áreas de prescrição
