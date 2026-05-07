## Causa raiz

Logs mostram: `permission denied for function has_role`. A função `public.has_role` está com `proacl` apenas para `postgres/service_role/sandbox_exec` — sem `authenticated` nem `anon`.

A tabela `public.user_roles` tem 4 policies; uma delas (`admins see all roles`) usa `has_role(auth.uid(), 'admin')`. Em qualquer `SELECT` do front, o Postgres avalia TODAS as policies aplicáveis, então mesmo o usuário só querendo ler suas próprias roles (via `users see own roles`) cai no `has_role` e recebe permissão negada.

Consequência em cascata: `useRoles()` falha → `isAdmin=false` → grupo "Administração" no sidebar fica oculto → não há botão para criar usuário.

O mesmo problema afetará policies em `students`, `tests`, `coach_invites`, `admin_audit_log` etc. — qualquer policy que chama `has_role`.

## Correção

Migração SQL única:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
```

Isso restaura o comportamento esperado. A função é `SECURITY DEFINER` e só lê `user_roles` filtrando por `_user_id`, então conceder EXECUTE para `authenticated` é seguro (continua sendo o padrão recomendado pelo guia de RBAC do Supabase). Não concedemos para `anon`.

## Validação

Após a migração:
1. Recarregar `/dashboard` com a conta `leonardofirmo809@gmail.com`.
2. Confirmar no console que `[useRoles] failed…` desapareceu.
3. Conferir que o grupo "Administração" aparece no sidebar com Visão geral / Treinadores / Alunos / Auditoria.
4. Em `/admin/treinadores`, o botão de criar usuário manual estará visível.

## Fora de escopo

- Refatorar policies (continuam corretas).
- Mexer em código frontend — o problema é puramente de permissão SQL.

## Arquivos alterados

- Nova migração SQL (apenas o GRANT acima).
