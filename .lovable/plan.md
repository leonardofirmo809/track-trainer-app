## Objetivo

Adotar o layout do PDF enviado (`Planilha_5km_Leonardo_v2.pdf`) como modelo padrão para os 4 geradores: 5km, 10km, 21km e 42km. Mantém toda a lógica existente (zonas, distribuição, customizações) — só muda a renderização visual.

## Diferenças vs. PDF atual

O gerador atual já tem a estrutura certa (header colorido, FTP, tabela de zonas, semanas com aquecimento/principal/recuperação). O modelo novo refina:

1. **Header** — cor `branding.primary` do treinador (mantém variável por treinador). Logo à esquerda OU nome em uppercase grande. FTP em card translúcido no canto superior direito (mesma faixa do header, sem caixa separada abaixo).
2. **Tabela de zonas** — coluna "Zona" com fundo colorido por zona:
   - Z1 verde claro / texto verde
   - Z2 azul claro / texto azul
   - Z3 laranja claro / texto laranja
   - Z4 vermelho claro / texto vermelho
   - Z5 roxo claro / texto roxo
3. **Faixa "SEMANA N"** — mantém na cor primary, full-width.
4. **Cabeçalho do dia** — pill claro (`#E8F1EC` ou primary 8%) com `TERÇA-FEIRA` em bold + título do treino + tags `[Z1/Z2]` coloridas inline.
5. **Seções (AQUECIMENTO/TREINO PRINCIPAL/RECUPERAÇÃO)** — label pequeno colorido (verde/azul/cinza respectivamente).
6. **Itens de treino** — duas colunas: à esquerda `5min [Z1]` (zona em badge colorido), à direita range em itálico cinza `6:58–8:50 min/km | 6,79–8,60 km/h`.
7. **Barra de intensidade vertical** — traço colorido na borda direita de cada bloco de seção (verde/amarelo/vermelho conforme intensidade do treino).
8. **Footer** — "Página N" centralizado em cinza (já existe — manter).

## Implementação técnica

### Novo módulo compartilhado

Criar `src/lib/planilha-pdf-theme.ts`:
- `ZONE_COLORS: Record<ZoneId, { bg: RGB; fg: RGB; bar: RGB }>` — paleta única para todas as planilhas.
- `SECTION_COLORS: Record<SectionName, RGB>` — cor do label de cada seção.
- `intensityBar(workoutType): RGB` — verde/amarelo/vermelho derivado do flag `intense` + tipo (já existe `WORKOUT_TYPES_*`).
- Helpers de desenho reutilizáveis: `drawHeaderBand`, `drawZonesTable`, `drawWeekBand`, `drawWorkoutCard`, `drawSectionLabel`, `drawWorkoutItem`. Recebem `(page, font, bold, italic, branding, ...)` e cuidam de medir/quebrar.

### Atualizar os 4 geradores

Editar (apenas a parte de renderização, mantendo a interface pública e a lógica de zona/distribuição):

- `src/lib/planilha-5km-pdf.ts`
- `src/lib/planilha-10km-pdf.ts`
- `src/lib/planilha-21km-pdf.ts`
- `src/lib/planilha-42km-pdf.ts`

Cada um passa a chamar os helpers do `planilha-pdf-theme.ts`, passando seus dados (`zones`, `weeks`, `WORKOUT_TYPES_*`). Assinaturas das funções `generatePlanilha*kmPdf(opts)` ficam inalteradas — chamadores das rotas não mudam.

### Cor do header

`branding.primary` (já vem de `useCoachBranding` / `profiles.brand_primary_color`). O verde do PDF de exemplo era apenas a cor do treinador "Leonardo". Se o treinador não tiver cor configurada, mantém o default `#0EA5E9` já existente.

### Cores das zonas

Fixas no tema (independentes do branding) — a relação Z1=verde, Z5=roxo é universal de fisiologia, não muda por treinador.

## QA obrigatório

Após implementar, gerar um PDF de teste para cada distância (5/10/21/42), converter para JPG com `pdftoppm -r 150` e inspecionar página por página: alinhamento das colunas de itens, badges de zona não quebrando, faixa SEMANA não cortada entre páginas, barra de intensidade na altura certa, header sem sobreposição com nome longo, cores acessíveis. Iterar até passar limpo.

## Fora de escopo

- Mudar o conteúdo dos treinos, distribuição, ou cálculo de zonas.
- Mudar UI das telas `/planilha-*`.
- PDF do teste 3km (`teste-3km-pdf.ts`).
- Salvar layout/preferências por treinador.

## Arquivos

**Criar:**
- `src/lib/planilha-pdf-theme.ts`

**Editar:**
- `src/lib/planilha-5km-pdf.ts`
- `src/lib/planilha-10km-pdf.ts`
- `src/lib/planilha-21km-pdf.ts`
- `src/lib/planilha-42km-pdf.ts`
