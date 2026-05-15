## Evoluir `/admin/treinadores` com abas, ver alunos, remover acesso e limite

Mantemos a URL atual e ampliamos a página. Sem nova rota.

### 1. Backend — RPC `get_all_coaches`
Migration nova:
```sql
CREATE OR REPLACE FUNCTION public.get_all_coaches()
RETURNS TABLE (
  id uuid, full_name text, email text,
  created_at timestamptz, has_role boolean,
  students_count integer
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.full_name, u.email, u.created_at,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'coach') AS has_role,
    (SELECT count(*)::int FROM public.students s WHERE s.coach_id = p.id) AS students_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles r2
    WHERE r2.user_id = auth.uid() AND r2.role = 'admin'
  )
  ORDER BY u.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_coaches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_coaches() TO authenticated;
```
A checagem de admin **dentro da função** é o gate de segurança (SECURITY DEFINER expõe `auth.users.email`, então retornamos vazio para não-admins).

### 2. Server function nova — `removeCoachRole`
`src/lib/admin-coaches.functions.ts` ganha:
- Input: `{ userId: string }` (Zod uuid).
- Middleware `requireSupabaseAuth` + checagem `has_role('admin')`.
- `supabaseAdmin.from('user_roles').delete().eq('user_id', userId).eq('role', 'coach')`.
- Insere `admin_audit_log` com `event_type = 'coach_role_removed'` (precisa adicionar esse valor ao enum `audit_event` na mesma migration).
- Bloqueia o admin de remover a própria role.

Para "ver alunos", **não precisa server fn nova**: admin já tem RLS `admins see all students`, então o cliente pode `supabase.from('students').select(...).eq('coach_id', id)` direto.

### 3. UI — `src/routes/_authenticated/admin.treinadores.tsx`

**Topo** (acima das abas):
- Título "Usuários" + descrição.
- Badge contador: `X de 4 treinadores ativos` — `X = coaches.filter(c => c.has_role).length`. Constante `COACH_LIMIT = 4` no topo do arquivo. Quando `X >= 4`, os botões "Convidar treinador" e "Criar conta manual" ficam desabilitados com tooltip "Limite de 4 treinadores atingido".

**Abas** (`Tabs` shadcn) com dois valores: `treinadores` (default) e `convites`.

**Aba "Treinadores"**:
- Tabela: Nome | Email | Cadastrado em | Status | Ações.
- Status: badge "Ativo" se `has_role`, "Sem acesso" se não.
- Ação **"Ver alunos"** → abre `Sheet` lateral que carrega `students` do coach (id, nome, email, nível, created_at) e mostra em tabela compacta. Se zero, "Este treinador ainda não tem alunos."
- Ação **"Remover acesso"** → `AlertDialog` de confirmação ("Os dados dos alunos serão preservados. O treinador não conseguirá mais acessar o sistema."). Confirma → chama `removeCoachRole`. Botão escondido se `c.id === user.id` (não pode remover a si mesmo) ou se `!c.has_role` (já está sem acesso).
- Botões do topo "Convidar treinador" e "Criar conta manual" continuam aqui (já existem).

**Aba "Convites"**:
- Mantém a tabela atual (Nome | Email | Status | Expira em | Ações com Copiar/Reenviar/Revogar).
- "Novo convite" usa o mesmo `Dialog` que já existe.

**Carregamento**:
- Substitui o `load()` atual por:
  - `supabase.rpc('get_all_coaches')` → `setCoaches`.
  - `supabase.from('coach_invites').select('*').order('created_at', { ascending: false })` → `setInvites`.
- Apaga o duplo fetch atual (user_roles + profiles).

### 4. Tipos
- `Coach { id, full_name, email, created_at, has_role, students_count }`.
- Atualiza `src/integrations/supabase/types.ts`? Não — é regenerado automaticamente pela migration; só usar typed RPC.

### Arquivos
- **Migration**: `get_all_coaches` + grants + adicionar `'coach_role_removed'` ao enum `audit_event`.
- **Edita** `src/lib/admin-coaches.functions.ts`: nova server fn `removeCoachRole`.
- **Reescreve** `src/routes/_authenticated/admin.treinadores.tsx`: abas, contador, drawer de alunos, remover acesso.

### Fora de escopo
- Renomear/criar `/admin/usuarios` (você optou por manter a URL).
- Excluir auth.users em cascata.
- Tornar o limite de 4 configurável (fica hardcoded por enquanto).
- Filtros / busca por nome (a base é pequena; podemos adicionar depois se precisar).
