## Causa

Em `src/lib/planilha-5km-distribute.ts` (linhas 75–87), após escolher os treinos da semana, a função move o treino de maior duração para o último dia. Isso embaralha a ordem dos códigos: quando o longão é T11, a semana sai como `T10, T12, T11`.

A tela e o PDF apenas renderizam na ordem devolvida por `distributeWeek`, então o conserto é só na distribuição.

## Mudanças

### `src/lib/planilha-5km-distribute.ts`

1. Remover o bloco "Treino mais longo no último dia" (linhas 75–87).
2. Logo após definir `chosen`, ordenar por código numérico do treino:
   ```ts
   const codeNum = (w: Workout) => parseInt(w.code.replace(/\D/g, ""), 10) || 0;
   chosen.sort((a, b) => codeNum(a) - codeNum(b));
   ```
3. Manter `sortDays`, `dropToFit`, detecção de intensos consecutivos e warnings sem alteração.

## Efeito

- Semanas sempre listadas em ordem crescente do código (`T10 → T11 → T12 …`) na tela e no PDF.
- O longão deixa de ser empurrado automaticamente para o último dia da semana — trade-off explícito do pedido.

## Fora de escopo

- Banco de treinos, PDF e UI permanecem inalterados.
- Sem reordenação manual / drag-and-drop.
