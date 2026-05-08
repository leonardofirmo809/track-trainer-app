## Objetivo

Adicionar exportação em PDF da Planilha 5KM personalizada com a marca do professor (logo + cores primária/secundária), reusando o mesmo padrão visual já usado no Teste 3km.

## Arquivos

### 1. Novo: `src/lib/planilha-5km-pdf.ts`
- Usa `pdf-lib` (já instalado), espelhando a estrutura de `src/lib/teste-3km-pdf.ts`:
  - Helpers `hexToRgb`, `tryEmbedLogo`, `drawText` (importados/duplicados do mesmo arquivo).
  - Cabeçalho colorido (cor primária) com logo do treinador à esquerda e nome do treinador à direita.
  - Rodapé com cor secundária + numeração de página.
- Função:
  ```ts
  generatePlanilha5kmPdf(opts: {
    studentName: string;
    studentLevel: string | null;
    ftpSecondsPerKm: number;
    zones: SavedZone[];
    level: 1 | 2;
    daysPerWeek: number;
    weekDays: DayCode[];
    currentPhase: 1 | 2 | 3 | 4;
    weeks: DistributionResult[]; // 4 semanas da fase
    branding: CoachBranding;
  }): Promise<Blob>
  ```
- Conteúdo do PDF (uma página A4 por semana, paginação automática):
  1. **Capa/Topo na 1ª página**: nome do aluno, data de geração, nível da planilha (N1/N2), fase atual + subtítulo, dias por semana, dias selecionados.
  2. **Bloco "Dados do aluno"**: FTP em mm:ss/km, nível cadastrado e tabela das zonas Z1–Z5 com pace (min/km) e velocidade (km/h) — mesma fonte usada na tela.
  3. **Para cada semana (1..4) da fase atual**:
     - Título "Semana N".
     - Lista por dia (SEG..DOM): código do treino, tipo, zonas resumidas; OFF para dias vazios.
     - Detalhamento de cada treino: aquecimento/principal/recuperação/complemento, com itens renderizados igual ao modal:
       - `single`: `{value}{unit} {zone} → pace e km/h da zona do aluno`.
       - `intervals`: `Nx ({on} + {off})` + linhas ON/OFF com pace/km/h.
       - `test`: `{meters}m — {label}` (destacado).
     - Aviso "Treinos intensos em dias consecutivos" quando aplicável.
- Quebra de página automática: helper que avança `y` e cria nova página (com header/rodapé) quando ultrapassa margem inferior.

### 2. Editar: `src/routes/_authenticated/planilha-5km.tsx`
- Importar `useCoachBranding` e `generatePlanilha5kmPdf`.
- Adicionar botão **"Exportar PDF"** (ícone `Download`) no Card 4 ao lado do título da fase (e/ou no rodapé do card), habilitado apenas quando `applied && weeks && zones`.
- Handler:
  - Monta `weeks` (já calculado), `zones`, `student`, branding.
  - Chama `generatePlanilha5kmPdf(...)`, cria `URL.createObjectURL(blob)` e dispara download `Planilha-5km-{nome-do-aluno}-Fase{phase}.pdf`.
  - Toast de sucesso/erro.
- Estado de loading no botão (`exporting`).
- Se branding ainda carregando ou sem teste/zonas, manter botão desabilitado.

## Detalhes técnicos

- Branding já vem de `useCoachBranding()` (logo, primary, secondary, coachName) — sem novas tabelas/migrações.
- Zonas: usar `dataQuery.data.latestTest.metadata.zones` (mesmo objeto já consumido no modal).
- Cores: `branding.primary` no header e títulos das semanas; `branding.secondary` no rodapé/labels secundários; texto em tons de cinza para legibilidade.
- Nada de novas dependências. Nada no backend.
- Sem alterar `planilha-5km-data.ts`, `planilha-5km-distribute.ts` nem `.functions.ts`.

## Fora de escopo

- Edição manual de treinos no PDF.
- Exportar todas as 4 fases num único PDF (apenas a fase atualmente selecionada).
- Configuração de marca (já existe em `/minha-marca`).
