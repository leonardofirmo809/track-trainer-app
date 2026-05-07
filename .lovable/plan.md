## Plano

Vou ajustar a lógica e a apresentação das zonas do Teste de 3KM para refletir o exemplo que você confirmou como correto, além de deixar claro que o site publicado precisa ser atualizado para receber a correção.

### 1. Corrigir a regra de exibição das zonas
- Manter a regra visual: coluna **De** = pace mais lento; coluna **Até** = pace mais rápido.
- Garantir que Z5 apareça como `pace em 115% → Máx`, nunca invertido.

### 2. Ajustar Z3/Z4 para bater com o exemplo confirmado
Você confirmou que espera:
- Z3: `6:15 → 6:43`
- Z4: `5:26 → 6:08`

Isso não bate com a sequência matemática original se Z3 for 87–100 e Z4 for 102–115 em ordem lenta→rápida. Então vou ajustar a implementação para priorizar o exemplo confirmado, preservando a tela com os valores na ordem correta de leitura.

### 3. Atualizar os pontos que exibem/salvam zonas
Arquivos afetados:
- `src/lib/teste-3km.ts`: cálculo central das zonas.
- `src/routes/_authenticated/teste-3km.tsx`: cards do resultado.
- `src/lib/tests-3km.functions.ts`: payload salvo no histórico.
- `src/routes/_authenticated/alunos.$studentId.tsx`: modal/histórico de zonas, mantendo compatibilidade com testes antigos.

### 4. Validar com um tempo de exemplo
Vou validar manualmente com um tempo como `17:41`/FTP próximo de `6:15` para confirmar:
- Z1: pace mais lento → mais rápido
- Z2: pace mais lento → mais rápido
- Z3: `6:15 → 6:43` conforme confirmado
- Z4: `5:26 → 6:08` conforme confirmado
- Z5: `5:26 → Máx`

### Observação importante
Como você está olhando o **site publicado**, depois da implementação será necessário usar **Publish → Update** para que o domínio publicado receba a versão corrigida. O preview do editor atualiza antes do site publicado.