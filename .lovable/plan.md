## Objetivo

Criar a área de **Administração** com 4 seções: visão geral, treinadores (já existe), alunos (todos) e auditoria. Acessível apenas para usuários com role `admin`.

## Estrutura de rotas

```
src/routes/_authenticated/
  admin.tsx                    (já existe — guard de role)
  admin.index.tsx              NOVO — /admin (visão geral)
  admin.treinadores.tsx        (já existe)
  admin.alunos.tsx             NOVO — /admin/alunos
  admin.auditoria.tsx          NOVO — /admin/auditoria
```

## Telas

### 1. `/admin` — Visão geral
Painel com:
- **4 cards de métricas**: Treinadores ativos, Convites pendentes, Alunos cadastrados (total), Testes registrados (total).
- **Atalhos** (cards clicáveis): Treinadores, Alunos, Auditoria.
- **Últimos eventos** (mini-lista): últimos 5 eventos da auditoria.

### 2. `/admin/alunos` — Alunos (todos)
Lista global de todos os alunos do sistema:
- Tabela com nome, e-mail, treinador (nome do coach), nível, distância-alvo, data de cadastro.
- Filtros: busca por nome/e-mail, filtro por treinador.
- Apenas leitura (admin não edita aluno de outro treinador).

### 3. `/admin/auditoria` — Auditoria
Histórico de eventos administrativos (criação/aceite/revogação de convites e criação manual de contas):
- Tabela com data, evento, alvo (e-mail), feito por (admin).
- Ordenado do mais recente para o mais antigo.

## Mudanças no banco

Nova tabela `admin_audit_log`:
- `event_type` (enum: `invite_created`, `invite_revoked`, `invite_resent`, `invite_accepted`, `coach_created_manual`)
- `target_email` (text)
- `target_user_id` (uuid, nullable)
- `actor_id` (uuid — admin que fez a ação)
- `metadata` (jsonb)
- `created_at`

RLS: apenas admin pode ler. Inserts feitos por triggers/server functions com SECURITY DEFINER.

Triggers:
- Em `coach_invites`: log automático em INSERT (`invite_created`), em UPDATE quando `status` muda (`invite_revoked`, `invite_accepted`).

A server function `createCoachAccount` insere manualmente o evento `coach_created_manual` após criar o usuário.

Para "Alunos (todos)": admin precisa enxergar todos os students. Adicionar policy `admins see all students` em `public.students`. Mesma coisa para `tests` (para a métrica de total de testes).

## Mudanças no UI

### Sidebar
Substituir o item único "Treinadores" pelo grupo **Administração** com 4 itens:
- Visão geral (`/admin`)
- Treinadores (`/admin/treinadores`)
- Alunos (`/admin/alunos`)
- Auditoria (`/admin/auditoria`)

### Server functions / queries
- `/admin` busca contagens via 4 queries `count` paralelas + 5 últimos logs.
- `/admin/alunos` faz join `students` + `profiles` (treinador) via duas queries (lista + map de coaches).
- `/admin/auditoria` lista direto da tabela `admin_audit_log` com nome do admin via join em profiles.

## Fora de escopo

- Edição/exclusão de alunos pelo admin.
- Filtros avançados de auditoria (por tipo, intervalo de data).
- Exportação CSV.
