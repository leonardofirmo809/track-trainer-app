## PDF do Teste 3KM: usar a data do teste no "Gerado em"

Hoje o rodapé do PDF imprime `Gerado em ${new Date()}` (data em que o PDF foi exportado). O PDF é montado a partir do formulário em memória (antes mesmo de salvar), então não existe `created_at` confiável; a melhor referência é o `testDate` que o usuário já preenche no formulário.

### Mudança

**`src/lib/teste-3km-pdf.ts`** (linha ~184)
- Trocar:
  ```ts
  const gen = `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;
  ```
- Por:
  ```ts
  const gen = `Gerado em ${new Date(testDate + "T00:00:00").toLocaleDateString("pt-BR")}`;
  ```
  (reaproveita o `testDate` já recebido e formatado em pt-BR, igual ao bloco do aluno na linha 69).

### Fora de escopo
- Layout do PDF, formato de data alternativo, mudança no comportamento de salvar teste.
