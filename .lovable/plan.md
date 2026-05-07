Remover o badge `[dev] user.id: … • role: …` do topo do `/dashboard` e os imports/variáveis usados só por ele (`useAuth`, `useRoles`, `isDev`) em `src/routes/_authenticated/dashboard.tsx`. Também remover as mensagens de diagnóstico em dev ("Verificando permissões…" e "Sem permissão admin") do `src/components/app-sidebar.tsx`, mantendo o grupo Administração condicionado a `isAdmin`.

Arquivos:
- `src/routes/_authenticated/dashboard.tsx`
- `src/components/app-sidebar.tsx`