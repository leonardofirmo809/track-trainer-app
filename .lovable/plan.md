## Plano

Ajustar a Z3 em `src/lib/teste-3km.ts` para começar em 87% (em vez de 93%), mantendo o limite superior em 100%.

### Mudança
- `ZONE_DEFS` → Z3: `from: 93` → `from: 87` (sem alterar `to: 100`).

### Resultado esperado (teste 18:00, FTP ≈ 6:22)
- Z2: termina em 87%
- Z3: 87% → 100% (De = pace mais lento, Até = pace mais rápido), sem gap entre Z2 e Z3
- Z4 e Z5: inalteradas

Nenhuma outra lógica, exibição ou payload precisa mudar — todos os arquivos de UI e salvamento já consomem `pctFrom`/`pctTo` e `paceSlowSec`/`paceFastSec` derivados desse campo.

### Observação
Após a correção, use **Publish → Update** para o site publicado refletir a mudança.