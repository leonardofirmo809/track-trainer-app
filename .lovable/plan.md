## Objetivo

Corrigir 4 problemas no PDF gerado pelas planilhas (5km e 10km):

1. Frase **"! Intensos em dias consecutivos"** aparecendo no cabeçalho da semana — remover.
2. Rodapé colorido com nome do treinador e "Aluno • Pág. N" — remover por completo.
3. Espaçamentos apertados causando **sobreposição** entre seções/itens — aumentar respiros.
4. **Nível 2 (4x/semana)**: o conteúdo da semana estoura a página e/ou se sobrepõe ao rodapé — corrigir paginação e altura útil.

Os 4 ajustes se aplicam aos dois arquivos:
- `src/lib/planilha-5km-pdf.ts`
- `src/lib/planilha-10km-pdf.ts`

## Mudanças

### 1. Remover aviso "Intensos em dias consecutivos"
Em `weeks.forEach((wk, wi) => { ... })`, deletar o bloco `if (wk.hasConsecutiveIntense) { ... drawText(... "! Intensos em dias consecutivos" ...) }`. A faixa "Semana N" continua com o título e nada mais.

### 2. Remover rodapé
Dentro de `newPage()`:
- Remover o `page.drawRectangle` que pinta `footerH = 28` em `secondary`.
- Remover os dois `drawText` ("Treinador: ..." e "Aluno: ... • Pág. N").
- Atualizar `contentBottom` de `50` para `28` (margem inferior limpa, sem rodapé visual).
- A constante `footerH` deixa de ser usada.

### 3. Melhorar espaçamento / evitar sobreposição
Pequenos ajustes de leading e gaps no laço de treinos:
- Após a faixa "Semana N": `y -= 32` (era 28).
- Entre cards de treino: `y -= 10` ao final de cada workout (era 6).
- Entre seções dentro de um treino: `y -= 8` (era 4).
- Linha do item principal: `y -= 13` (era 12); altura usada em `ensure` idem.
- Sub-linhas (zonas): `y -= 12` (era 10); `ensure(12)` idem.
- Cabeçalho de seção (AQUECIMENTO/etc.): `y -= 13` (era 11) e `ensure(18)`.
- Card título do treino: `titleBoxH = Math.max(20, titleLines.length * 14 + 8)`; gap após o card `y -= titleBoxH + 6` (era +4).
- Nota (italic): `y -= 12` por linha (era 11) e gap final `y -= 4` (era 2).
- OFF: `y -= 16` (era 14).

### 4. Corrigir layout do Nível 2 (4x/semana)
O problema raiz é "uma semana por página" assumindo 3 treinos. Com 4 treinos a semana estoura. Mudanças:
- Remover a regra `if (wi > 0) newPage();` que força quebra por semana.
- A função `ensure(space)` já cria nova página sob demanda — ela passa a governar a quebra natural.
- Antes de desenhar a faixa "Semana N", calcular um bloco mínimo (`minWeekHeader = 22 + 32 = 54`) e chamar `ensure(minWeekHeader + 80)` para evitar que a faixa fique órfã no rodapé da página anterior.
- Antes de cada treino, calcular uma estimativa rápida de altura (título + nota + soma de seções e itens) e chamar `ensure(estHeight)` — assim, um treino inteiro nunca fica partido entre páginas.
- Ajustar `contentBottom = 28` (vide item 2) libera ~22pt extra por página, suficiente para acomodar 4 cards na maioria dos casos sem quebrar.

### Fora de escopo
- Layout das telas em si (5km/10km na UI) — sem mudança.
- `planilha-21km` / `planilha-42km` (não têm PDF dedicado).
- Conteúdo (zonas, dados de treino, helpers de volume) — apenas leitura.
