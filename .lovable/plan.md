## Problema

O grupo "Administração" já existe em `src/components/app-sidebar.tsx` e é renderizado quando `isAdmin === true` (vindo de `useRoles()` em `src/lib/use-role.ts`). No banco há 1 usuário com role `admin` (`5c5f18f4-…`), e a policy RLS `users see own roles` permite ao próprio usuário ler sua role. Mesmo assim o grupo não aparece.

Causas prováveis:
1. O usuário logado **não é** o admin do banco (login com outra conta).
2. `useRoles()` falha silenciosamente (sem tratamento de erro/log) — qualquer rejeição da Promise deixa `roles=[]` e `isAdmin=false` sem aviso.
3. Não há indicador de loading: enquanto a query roda, o grupo fica oculto e nunca reaparece se algo der errado.

## Correções

### 1. Hardening de `src/lib/use-role.ts`
- Tratar `error` da query e logar no console (`console.warn`) com a mensagem retornada por Supabase para facilitar debug futuro.
- Garantir `setLoading(true)` no início e `setLoading(false)` em todos os caminhos.
- Tipar a resposta corretamente.

### 2. Sidebar tolerante a estado de loading + diagnóstico
Em `src/components/app-sidebar.tsx`:
- Importar `loading` de `useRoles()`.
- Enquanto `loading === true`, renderizar um item placeholder ("Verificando permissões…") no lugar do grupo, **somente em dev** (`import.meta.env.DEV`), para confirmar que a query roda.
- Quando `loading === false && !isAdmin`, em dev mostrar um pequeno texto "Sem permissão admin" no rodapé do sidebar (apenas dev), para o usuário entender o porquê. Em produção, comportamento atual (oculto).

### 3. Verificação rápida do usuário logado
Adicionar no Dashboard (`src/routes/_authenticated/dashboard.tsx`) um aviso de uma linha **só em dev** mostrando o `user.id` atual. Isso permite confirmar visualmente se a conta logada bate com a admin (`5c5f18f4-bc8b-4c63-9e06-4accfd4699ce`).

> Se após isso ficar claro que o usuário logado **não é** o admin, a solução é simplesmente fazer login com a conta admin correta — ou promover a conta atual via SQL (`INSERT INTO user_roles (user_id, role) VALUES ('<id>', 'admin')`).

## Fora de escopo
- Criar UI de "promover usuário a admin" (já existe a tela `/admin/treinadores`).
- Mudar layout/posição do menu Admin (usuário pediu apenas que o sidebar volte a mostrar).

## Arquivos alterados
- `src/lib/use-role.ts` — tratamento de erro + log
- `src/components/app-sidebar.tsx` — placeholder de loading e mensagem dev
- `src/routes/_authenticated/dashboard.tsx` — badge dev com user.id
