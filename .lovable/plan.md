## Diagnóstico

A lógica de cálculo em `src/lib/teste-3km.ts` já segue a sequência pedida (FTP em minutos decimais → `base = 60/FTP` → `vel = base × pct/100` → `pace = 60/vel`). O problema está em **dois pontos da apresentação** que fazem o resultado parecer "errado":

1. **Z5 está invertida em relação às demais.** O código gera `paceFromSec = null` e mostra `"Máx → {pace a 115%}"`, ou seja, **rápido → lento**. As outras zonas (Z1–Z4) seguem **lento → rápido** (`paceFromSec` lento, `paceToSec` rápido). Isso quebra a regra "De = mais lento, Até = mais rápido".
2. **Nomenclatura confusa** dos campos `paceFromSec` / `paceToSec` (que mapeiam para `pctFrom`/`pctTo` mas representam paces invertidos em relação ao percentual). Vou renomear para `paceSlowSec` (lento) e `paceFastSec` (rápido) para evitar futuros bugs.

## Mudanças

### 1. `src/lib/teste-3km.ts`
Refatorar `Zone` e `calcularTeste3km` para deixar a semântica explícita:
- Campos: `paceSlowSec: number | null` e `paceFastSec: number | null`.
- Para Z1–Z4: `paceSlowSec = 60/(base × pctFrom/100) × 60`, `paceFastSec = 60/(base × pctTo/100) × 60`.
- Para Z5: `paceSlowSec = 60/(base × 115/100) × 60` (limite inferior = 115%), `paceFastSec = null` (= "Máx", sem teto).
- Manter `velFrom` (vel a `pctFrom`) e `velTo` (vel a `pctTo`, `null` em Z5 = `+`).
- Manter `parseMmss`, `formatMmss`, `TEST_MIN_SECONDS`, `TEST_MAX_SECONDS` e a fórmula `ftpMin = (tempoMin × 1.06) / 3`.

### 2. `src/routes/_authenticated/teste-3km.tsx`
Atualizar a renderização do cartão de zonas para refletir a regra **De (lento) → Até (rápido)** em todas as zonas:
- PACE: `{paceSlowSec ? formatMmss(paceSlowSec) : "Máx"} → {paceFastSec ? formatMmss(paceFastSec) : "Máx"}`.
  - Z1: `10:25 → 8:13`
  - Z2: `8:13 → 7:11`
  - Z3: `7:11 → 6:15`
  - Z4: `6:08 → 5:26`
  - Z5: `5:26 → Máx`
- Esteira (km/h): manter `{velFrom.toFixed(2)} → {velTo == null ? "+" : velTo.toFixed(2)}` (lento → rápido em km/h: na verdade `velFrom` é o menor; já está correto).
- Atualizar também `src/routes/_authenticated/alunos.$studentId.tsx` no modal "Ver zonas" para usar os novos campos.

### 3. `src/lib/tests-3km.functions.ts`
Atualizar o payload salvo em `metadata.zones` para usar `paceSlowSec` / `paceFastSec` (em vez de `paceFromSec` / `paceToSec`). Testes salvos antes continuarão sendo lidos pelo modal com fallback para os nomes antigos.

### Validação contra o exemplo (FTP 6:15, base 9,60 km/h)
- Z1 60–76%: vel 5,76 → 7,30 km/h | pace 10:25 → 8:13 | PSE 1–2 ✓
- Z2 76–87%: vel 7,30 → 8,35 | pace 8:13 → 7:11 | PSE 3–4 ✓
- Z3 87–100%: vel 8,35 → 9,60 | pace 7:11 → 6:15 | PSE 5–6 ✓
- Z4 102–115%: vel 9,79 → 11,04 | pace 6:08 → 5:13 | PSE 7–8 ✓
- Z5 115–∞: vel 11,04+ | pace 5:13 → Máx | PSE 9–10 ✓

(Observação: o seu exemplo mostra Z3 `6:15–6:43` e Z4 `5:26–6:08`. Com a fórmula que você mandou, os números corretos são os acima — `6:43` não é gerado por nenhum percentual entre 87% e 100%. Vou seguir estritamente a fórmula que você definiu.)

### Fora do escopo
- Migração retroativa dos testes já salvos (mantemos compatibilidade de leitura).
- Mudar a fórmula de FTP ou os percentuais.