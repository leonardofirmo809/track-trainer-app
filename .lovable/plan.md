## Tela `/teste-3km`

Substituir o placeholder atual de `src/routes/_authenticated/teste-3km.tsx` por uma tela funcional, acessível a coach e admin (mesma proteção de `_authenticated` já existente).

### Layout
1. Cabeçalho "Teste de 3KM" + breadcrumb.
2. **Card de entrada**:
   - Combobox/Select com a lista de alunos (`students` filtrados via RLS — coach vê os seus, admin vê todos).
   - Input "Tempo do teste" com máscara `mm:ss`, placeholder "Ex: 17:42".
   - Date picker opcional "Data do teste" (default hoje).
   - Botão **Calcular**.
3. **Card de resultado** (só após calcular válido):
   - Destaque "FTP: m:ss min/km".
   - 5 cards de zona (grid responsivo 1 col mobile / 5 col desktop) com cores Z1 verde-claro → Z5 vermelho.
   - Cada zona: nome, faixa de pace (mm:ss → mm:ss min/km), faixa de esteira (X.X → X.X km/h), PSE (1–10) e frase.
   - Botão **Salvar no perfil do aluno**.
4. Toast (`sonner`) de sucesso/erro.

### Cálculo (`src/lib/teste-3km.ts`, novo arquivo puro)
- `parseMmss("17:42") → 1062` segundos. Erro se não bater regex.
- `formatMmss(1062) → "17:42"`.
- `tempoMin = segundos / 60`.
- `ftpMin = (tempoMin * 1.06) / 3` → pace em min/km.
- `velocidadeBase = 60 / ftpMin` (km/h).
- Zonas com percentuais `[60,76,87,102,115]` (limites 60-76, 76-87, 87-100, 102-115, 115-∞):
  - `paceLimite = 60 / (velocidadeBase * pct/100)` em min/km
  - `velLimite = velocidadeBase * pct/100` em km/h
  - Z5: limite superior = "Máximo" / sem cap (mostrar `pace_min` como "—" e `vel_max` como `+`).
- Validação: tempo entre `10:00` e `40:00`; aluno obrigatório.
- Testes unitários: pular (não há harness configurado), validar manualmente com o exemplo João Silva 17:42.

### Persistência
Usar a tabela `tests` já existente. Colunas atuais cobrem `student_id`, `coach_id`, `test_type='3km'`, `test_date`, `duration_seconds`, `pace_seconds_per_km`. Para guardar as zonas e o FTP estruturados (e mantê-los visíveis no perfil do aluno), **adicionar coluna**:

```sql
ALTER TABLE public.tests ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Sem mudanças de RLS. Na inserção:
- `student_id`, `coach_id = auth.uid()` (admin pode inserir só se for o coach do aluno; se admin precisar registrar para outro coach, deixar `coach_id = student.coach_id` via server function admin). **Decisão simples**: setar `coach_id = student.coach_id` sempre, usando uma `createServerFn` com `requireSupabaseAuth` que faz lookup do `coach_id` do aluno. Isso evita bater na policy de INSERT de coach quando admin estiver salvando.
- `metadata = { ftp_seconds_per_km, zones: [{ zone, pace_min, pace_max, vel_min, vel_max, pse_min, pse_max, level, phrase }] }`.
- Histórico: cada cálculo cria uma nova row (não atualiza). Já é o comportamento natural.

### Server function
Novo `src/lib/tests-3km.functions.ts`:
- `saveTeste3km({ studentId, testDate, durationSeconds, paceSecondsPerKm, metadata })`
- Middleware `requireSupabaseAuth`.
- Lê `students.coach_id` (RLS aplicada como o usuário). Admin via `has_role` consegue ler. Coach só lê os seus.
- Insere em `tests` com `coach_id = students.coach_id`. Para admin contornar a policy `coach inserts own tests`, usar `supabaseAdmin` apenas para o INSERT (o lookup já validou autorização).

### Visualização no perfil do aluno
A aba "Testes" em `alunos.$studentId.tsx` já lista `tests`. Adicionar:
- Coluna "FTP" (lê `metadata.ftp_seconds_per_km` formatado).
- Linha expansível ou modal "Ver zonas" que exibe as 5 zonas salvas.

### Navegação/permissão
- Sidebar já tem "Teste de 3KM" no grupo Prescrição. Manter visível para coach e admin (ambos usam).
- Nada adicional em `_authenticated`.

### Arquivos
- `supabase/migrations/<ts>.sql` — adicionar `metadata jsonb`.
- `src/lib/teste-3km.ts` — cálculos puros e formatos.
- `src/lib/tests-3km.functions.ts` — server fn `saveTeste3km`.
- `src/routes/_authenticated/teste-3km.tsx` — tela completa.
- `src/routes/_authenticated/alunos.$studentId.tsx` — coluna FTP + drawer "Ver zonas".

### Fora de escopo
- Editar/excluir teste já salvo.
- Comparativo gráfico de testes anteriores (apenas tabela cronológica).
- Telas de outras provas (5/10/21/42 km).
