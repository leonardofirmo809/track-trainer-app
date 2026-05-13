## Status atual

A Planilha 21km já foi implementada na rodada anterior. Todos os arquivos do plano original existem:

- `src/lib/planilha-21km-data.ts` (5 planilhas × 4 semanas × 4 slots, N1 e N2, com Teste 3km nas Sem 4 das Planilhas 2 e 4 e Simulado 21km no Slot 4 da Plan 5 Sem 4)
- `src/lib/planilha-21km-distribute.ts` (validação fixa de 4 dias)
- `src/lib/planilha-21km-stats.ts` (volume/duração via FTP)
- `src/lib/planilha-21km.functions.ts` (`getPlanilha21kmData`, `savePlanilha21kmConfig`, `plan_type='21km'`)
- `src/lib/planilha-21km-pdf.ts` (PDF com cabeçalho de marca, zonas, semanas, lembretes do Passo 18)
- `src/routes/_authenticated/planilha-21km.tsx` (UI com 5 abas, seleção de aluno, validação de 4 dias, gráficos e modal de detalhe)

O enum `plan_type` no banco já contém `'21km'`, então não é necessária migration.

## O que falta

Apenas verificação manual no preview, sem novas mudanças de código:

1. Abrir `/planilha-21km` com um aluno que tenha Teste 3km cadastrado.
2. Trocar entre Nível 1 e Nível 2 e confirmar que ambos exigem 4 dias.
3. Marcar 4 dias, aplicar e navegar pelas 5 abas de planilha.
4. Confirmar que aparece "Teste 3km" no Slot 1 da Sem 4 (Planilhas 2 e 4) e "Simulado 21km" no Slot 4 da Plan 5 Sem 4.
5. Salvar a configuração e exportar o PDF.

Se a verificação encontrar algum bug específico (texto, número, layout), corrijo pontualmente em uma rodada seguinte.

## Pergunta

Quer que eu prossiga abrindo o preview e fazendo essa validação, ou já pode testar você mesmo? Se preferir, posso pular direto para qualquer ajuste fino que você já tenha em mente.
