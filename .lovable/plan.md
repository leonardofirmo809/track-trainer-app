# Ajustes de diagramação no PDF da Planilha 5KM

Arquivo único alterado: `src/lib/planilha-5km-pdf.ts` (geração via `pdf-lib`).

## Problemas identificados e correções

### 1. Card FTP sobrepõe nome/info do aluno
Hoje o card é desenhado com `cardY = y - cardH + 12`, ou seja, sobe 12pt acima da linha do nome — invadindo o cabeçalho quando o nome é longo ou quando há a linha "Cadastro:".

**Correção**:
- Reservar um bloco de cabeçalho do aluno com largura limitada (até `cardX - 12`) para que o nome não passe por baixo do card.
- Posicionar o card ao lado do nome, alinhando o topo com o nome (`cardY = y - cardH`), sem o offset de +12.
- Avançar `y` para `min(yAposTextoAluno, cardY) - 18` para garantir que o conteúdo seguinte (Zonas) comece abaixo de ambos.
- Se o nome exceder a largura disponível, truncar com reticências em vez de transbordar sobre o card.

### 2. Texto cortado / extrapolando margens
Causas no código atual:
- O título do treino (`titleLine`) é desenhado sem wrap nem truncamento; em treinos com `type` longo + várias zonas, estoura para fora da caixa de 18pt.
- Itens `single`/`intervals` (`• ${main}`) também não passam por `wrap` — só os `sub` são quebrados.
- Largura disponível para `sub` usa `A4.w - margin*2 - 30` mas o texto começa em `margin + 26`, então a margem direita correta seria `A4.w - margin - (margin + 26) = A4.w - margin*2 - 26`. Diferença pequena, mas alinhar.

**Correção**:
- Calcular a largura útil de cada nível e aplicar `wrap()` em: título do treino, linha principal de cada item, e textos das zonas.
- Ajustar a altura do retângulo do título do treino para acomodar 1–2 linhas (calcular pela quantidade de linhas após wrap).
- Em todos os `drawText` longos, garantir que `ensure(spaceCalculado)` reflita o número real de linhas após wrap.
- Padronizar o cálculo `maxW = A4.w - margin - x` para cada indentação.

### 3. Uma semana por página
**Correção**:
- No loop `weeks.forEach`, antes de desenhar cada semana **a partir da segunda**, chamar `newPage()` para forçar quebra. A primeira semana continua na página atual (logo após a tabela de Zonas).
- Remover os `ensure(40)` específicos do header de semana (não mais necessários após `newPage`).
- Manter `ensure()` dentro da semana para tratar o caso raro em que uma única semana ultrapassar uma página (continua em uma página seguinte sem quebrar a regra "uma semana por página" no caso comum).

### 4. Pequenos ajustes de robustez
- Garantir que o `titleLine` da semana ("Semana N") não conflite com o aviso de intensos consecutivos: truncar/encurtar se necessário.
- Header da página: se o subtítulo da fase for muito longo, truncar para não invadir a área do título "PLANILHA 5KM".

## Fora de escopo
- Trocar a fonte por uma TTF Unicode (mantém Helvetica/WinAnsi).
- Mudar layout das zonas em colunas (continua com a tabela atual).
- Mudanças visuais na UI da página `/planilha-5km`.

## Resumo das mudanças
Apenas `src/lib/planilha-5km-pdf.ts`:
1. Reposicionar o card FTP para não sobrepor o nome/info do aluno.
2. Aplicar `wrap()` + altura dinâmica em título do treino, linha principal dos itens e textos longos.
3. Forçar `newPage()` no início de cada semana, exceto a primeira.
4. Padronizar cálculos de `maxW` por nível de indentação.
