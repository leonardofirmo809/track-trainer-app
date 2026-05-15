## Onboarding obrigatório no primeiro login do treinador

### 1. Migração no banco
Adicionar 3 colunas em `profiles`:
- `onboarding_completed boolean NOT NULL DEFAULT false`
- `specialty text`
- `bio text`

Backfill: marcar `onboarding_completed = true` para perfis já existentes (admin atual + qualquer coach já cadastrado) para não forçar onboarding em quem já está usando o sistema. Critério: `full_name IS NOT NULL AND full_name <> ''`.

### 2. Gate de redirecionamento
Editar `src/routes/_authenticated.tsx`:
- Buscar `profiles.onboarding_completed` do usuário logado (via `supabase.from('profiles').select('onboarding_completed, full_name').eq('id', user.id).single()`).
- Se `false` (ou `full_name` vazio) **e** a rota atual não for `/onboarding`, `<Navigate to="/onboarding" />`.
- Enquanto carrega o profile, mostrar "Carregando…".
- Admin (`has_role admin`) é isento — não redireciona.

### 3. Rota `/onboarding`
Novo arquivo `src/routes/_authenticated/onboarding.tsx` (dentro do layout autenticado para herdar a sessão, mas renderizando tela cheia sem sidebar — usar layout próprio simples, sem `SidebarProvider`). Alternativa mais limpa: criar como rota top-level `src/routes/onboarding.tsx` que faz seu próprio gate de auth, evitando o sidebar. **Vou usar essa segunda opção** para a UI ficar limpa e centrada.

Componente com state `step` (1, 2, 3) e estado local dos campos:

**Passo 1 — Boas-vindas + nome**
- Título "Bem-vindo(a) ao sistema!" + subtítulo
- Input "Como prefere ser chamado(a)?" (obrigatório, 2–80 chars, validação Zod)
- Botão "Continuar" → vai para passo 2 (sem salvar ainda)

**Passo 2 — Especialidade + bio**
- Select/RadioGroup "Qual sua principal modalidade?" com opções: `10km | 21km | 42km | Trail | Triathlon | Todas`
- Textarea "Bio curta (aparecerá para seus atletas)" (opcional, máx 280 chars)
- Botões "Voltar" / "Continuar"

**Passo 3 — Confirmação**
- "Tudo pronto! Seu perfil está configurado."
- Botão "Ir para o dashboard" → executa o save + redirect

### 4. Salvamento
No clique final do passo 3, um único `update` em `profiles`:
```ts
supabase.from('profiles').update({
  full_name, specialty, bio, onboarding_completed: true
}).eq('id', user.id)
```
Após sucesso: `navigate({ to: '/dashboard' })` + invalidar query do profile (e `router.invalidate()` para o gate reavaliar).

### 5. UX
- Indicador de progresso simples no topo (ex.: "Passo 1 de 3" + barra).
- Toast de erro se update falhar; botão final desabilitado durante o save.

### Fora de escopo
- Não criar página de edição de perfil completa.
- Não exibir `specialty`/`bio` em outras telas ainda.
- Não permitir pular o onboarding.
