## Limite configurável de licenças de treinadores

### 1. Migração: `app_settings` + reforço no trigger

Tabela:
```sql
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read app_settings" ON public.app_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update app_settings" ON public.app_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings(key, value) VALUES ('max_coaches', '4')
  ON CONFLICT (key) DO NOTHING;
```

Reforço no servidor — atualizar `handle_new_user()` (já existente) para checar o limite **antes** de inserir em `user_roles`:
```sql
SELECT COALESCE((SELECT value::int FROM app_settings WHERE key='max_coaches'), 4) INTO _limit;
SELECT count(*) FROM user_roles WHERE role='coach' INTO _current;
IF _current >= _limit THEN
  RAISE EXCEPTION 'Limite de treinadores atingido (% de %).', _current, _limit
    USING ERRCODE = 'check_violation';
END IF;
```
Esse é o único chokepoint: cobre tanto `acceptInvite` quanto `createCoachAccount`, já que ambos passam por `auth.users` insert.

### 2. UI `/admin/treinadores`

- Substituir a constante `COACH_LIMIT = 4` por leitura de `app_settings` no `load()`:
  `supabase.from('app_settings').select('value').eq('key','max_coaches').maybeSingle()`. Fallback 4 se vazio.
- Trocar o `Badge "X de N treinadores ativos"` por um bloco com:
  - Texto "Treinadores: X / N"
  - Barra de progresso (`<Progress value={(active/limit)*100} />`)
  - Cor destaque (destructive) quando `atLimit`
- Tooltip dos botões "Convidar" e "Criar conta manual" passa a exibir: *"Limite de licenças atingido. Entre em contato para ampliar seu plano."*
- Tratar erro do RPC/insert quando o trigger lançar a exceção (toast com a mensagem retornada pelo Postgres).

### 3. Nova rota `/admin/configuracoes`

Arquivo `src/routes/_authenticated/admin.configuracoes.tsx` (entra no layout `_authenticated/admin` que já valida admin):

- Card "Limite de treinadores"
  - Mostra valor atual (input numérico, `min={1}`, `max={1000}`)
  - Mostra "Treinadores ativos no momento: X" (read-only, via `get_all_coaches` ou `count` direto em `user_roles`)
  - Botão "Salvar" → `supabase.from('app_settings').update({ value: String(n), updated_at: now() }).eq('key','max_coaches')`
  - Validação client: inteiro ≥ que `activeCount` (avisa se tentar setar abaixo do número atual de coaches; permite mas mostra warning).
  - Toast de sucesso/erro.

### 4. Sidebar

Adicionar entrada "Configurações" (ícone `Settings`) no grupo Administração de `src/components/app-sidebar.tsx`, apontando para `/admin/configuracoes`.

### Fora de escopo
- Não criar página de cobrança/upgrade real (apenas o texto na tooltip).
- Não permitir múltiplos settings genéricos ainda — só `max_coaches` é exposto na UI.
- Não migrar nada para uma tabela de planos/assinatura.
