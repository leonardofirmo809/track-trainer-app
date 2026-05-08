## Causa

`pdf-lib` com a fonte padrão Helvetica usa codificação WinAnsi, que não suporta `→` (0x2192), `★` nem `⚠`. Esses caracteres aparecem em `src/lib/planilha-5km-pdf.ts` e quebram o `drawText`.

## Mudanças

**Arquivo:** `src/lib/planilha-5km-pdf.ts`

Trocar caracteres não-WinAnsi por equivalentes ASCII:

1. Em `itemLines` (item `single`): `→ ${zoneRangeText(...)}` → `> ${zoneRangeText(...)}`.
2. No item `test`: `${it.meters}m — ${it.label} ★` → `${it.meters}m — ${it.label} *`.
3. No header de semana com aviso: `⚠ Intensos em dias consecutivos` → `! Intensos em dias consecutivos`.

`•`, `–` e `—` são mantidos (suportados em WinAnsi).

## Fora de escopo

- Embutir fonte TTF Unicode com `@pdf-lib/fontkit` (resolveria o problema genericamente, mas adiciona ~300KB no bundle e dependência só para 3 caracteres decorativos).
- Mudanças na tela ou na lógica de distribuição.
