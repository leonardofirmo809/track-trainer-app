## Problema

No header do card "4. Fase e treinos" (4 planilhas: 5/10/21/42km), o `PlanStartDatePicker` é renderizado lado a lado com os botões **Personalizar planilha** e **Exportar PDF**. Como ele tem `flex-col` com `Label` em cima do `Button`, ele fica mais alto que os irmãos — o header usa `items-center` (padrão do flex), então o botão da data acaba flutuando deslocado e o conjunto parece torto.

## Correção (apenas UI, escopo mínimo)

Atualizar `src/components/planilha/plan-start-date-picker.tsx`:

1. Remover o wrapper `flex-col` + `<Label>` acima. O botão passa a ser um único elemento da mesma altura dos irmãos (`size="sm"`, `h-8`), alinhando perfeitamente no `CardHeader`.
2. Manter a semântica de label via `aria-label="Data de início do treino"` no `Button` e um `title` no trigger explicando o campo (mesmo padrão de tooltip nativo já usado no botão "Personalizar planilha").
3. Prefixar o texto do botão com um rótulo curto e discreto: `Início: 19/05/2026`, para que o usuário ainda entenda do que se trata sem o label externo.
4. O indicador "salvando…" continua dentro do próprio botão (como hoje), à direita do texto.

Nada muda nos 4 arquivos de rota — eles continuam renderizando `<PlanStartDatePicker .../>` no mesmo lugar; só o componente em si fica de altura única e inline.

## Fora de escopo

- Lógica de salvar/sincronizar a data (já funciona).
- Geração do PDF.
- Outros pontos do layout do card.
