## Objetivo

Adicionar botão "Exportar PDF" na tela do Teste de 3km que gera um PDF completo personalizado com a logo e as cores do treinador logado.

## 1. Configuração da marca do treinador (uma vez)

Estender a tabela `profiles` com:
- `brand_logo_url` (text) — URL pública da logo
- `brand_primary_color` (text) — cor primária em hex (ex: `#0EA5E9`)
- `brand_secondary_color` (text) — cor secundária em hex

Criar bucket de storage `coach-branding` (público para leitura, escrita restrita ao próprio treinador via RLS por path `{user_id}/...`).

Nova página **"Minha marca"** em `src/routes/_authenticated/minha-marca.tsx` (link na sidebar) com:
- Upload da logo (PNG/JPG/SVG, até 2MB) → sobe para `coach-branding/{userId}/logo.{ext}`
- Color pickers para cor primária e secundária
- Preview de como ficará no PDF
- Botão Salvar (atualiza `profiles`)

## 2. Geração do PDF

Adicionar botão **"Exportar PDF"** ao lado de "Salvar no perfil do aluno" em `src/routes/_authenticated/teste-3km.tsx`, ativo sempre que houver resultado calculado (não exige aluno selecionado, mas usa nome do aluno se houver).

Conteúdo do PDF (1 página A4):
- **Cabeçalho**: faixa com cor primária, logo do treinador à esquerda, título "Teste de 3KM — Zonas de Treinamento" à direita
- **Bloco do aluno**: nome do aluno (ou "Teste avulso"), data do teste, tempo do teste, FTP em destaque com cor primária
- **Tabela de zonas** (5 linhas, bordas com cor secundária): Zona | Nível | PSE | Pace De → Até (min/km) | Esteira De → Até (km/h) | Frase PSE
- **Rodapé**: nome do treinador (de `profiles.full_name`), gerado em DD/MM/AAAA

Biblioteca: `pdf-lib` (puro JS, funciona no browser, suporta cores e imagens). Geração 100% no client — sem server function. Fonte embutida (Helvetica padrão do PDF).

## 3. Detalhes técnicos

- Hook `useCoachBranding()` que faz query do `profiles` do usuário logado e retorna `{ logoUrl, primary, secondary, coachName }` com defaults caso ainda não tenha configurado.
- Função `generateTeste3kmPdf(result, student, branding)` em `src/lib/teste-3km-pdf.ts` que retorna um `Blob` e dispara download via `URL.createObjectURL` + `<a download>`.
- Logo carregada via `fetch` → `arrayBuffer` → `pdfDoc.embedPng/embedJpg`.
- Validação de cor hex; fallback para cores neutras se inválida.

## 4. Entregáveis

- Migração: 3 colunas em `profiles` + bucket `coach-branding` + RLS de storage
- Nova rota `/minha-marca` com upload e color pickers
- Item na sidebar
- `src/lib/teste-3km-pdf.ts` (geração do PDF)
- Botão "Exportar PDF" na tela do Teste de 3km
- Dependência: `pdf-lib`

## Fora do escopo

- Exportação a partir do histórico no perfil do aluno (pode ser adicionada depois)
- Múltiplos templates de PDF
- Marca por aluno
