## Mostrar data de criação do plano no PDF

Hoje o PDF imprime `Gerado em ${new Date()}` (data do dia em que o PDF foi exportado). Vou trocar para a data de criação do plano (`training_plans.created_at`), conforme escolhido.

### Mudanças

1. **`src/lib/planilha-pdf-theme.ts`**
   - Adicionar campo opcional `generatedAt?: string | Date` em `RenderPlanilhaOpts`.
   - Em `renderPlanilhaPdf`, usar `generatedAt` (formatado em `pt-BR`) na linha "Gerado em ..."; se ausente, manter `new Date()` como fallback.

2. **`src/lib/planilha-5km-pdf.ts`, `planilha-10km-pdf.ts`, `planilha-21km-pdf.ts`, `planilha-42km-pdf.ts`**
   - Adicionar `generatedAt?: string` nas opções de `generatePlanilhaXkmPdf` e repassar para `renderPlanilhaPdf`.

3. **`src/lib/planilha-5km.functions.ts`, `planilha-10km.functions.ts`, `planilha-21km.functions.ts`, `planilha-42km.functions.ts`**
   - Incluir `created_at` no `.select(...)` da query de `training_plans` em `getPlanilhaXkmData` e retornar no `plan`.

4. **`src/routes/_authenticated/planilha-5km.tsx`, `planilha-10km.tsx`, `planilha-21km.tsx`, `planilha-42km.tsx`**
   - Em `handleExportPdf`, passar `generatedAt: dataQuery.data.plan?.created_at` para o gerador de PDF.

### Fora de escopo
- Layout do PDF, formato de data alternativo, exibir data em outros lugares na UI.
