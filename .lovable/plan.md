## Problemas

1. **Página Minha marca**: o botão "Enviar logo" sempre substitui (upsert), mas não há UI para **remover** a logo, nem botão claro de **trocar** com preview. Hoje o usuário consegue só re-enviar; não consegue voltar para "sem logo".
2. **PDF**: em `planilha-pdf-theme.ts > drawHeader()`, quando há logo, ela é desenhada em `x = margin` (mesma posição esquerda) e o **nome do aluno também é desenhado em `leftX = margin`** logo abaixo, mas o `leftX` nunca é deslocado para depois da logo — então logo e nome do aluno se sobrepõem visualmente no header.

## Correção

### 1. `src/routes/_authenticated/minha-marca.tsx` — UI de gerenciar logo

- Ao lado do botão **Enviar logo** (quando `logoUrl` existe), adicionar:
  - Botão **Trocar logo** (variant `outline`) que abre o file picker (mesmo input).
  - Botão **Remover logo** (variant `destructive` ghost / outline destrutivo) que:
    - Limpa o estado local: `setLogoUrl(null)`.
    - Mostra toast "Logo removida. Clique em Salvar para confirmar."
    - O `handleSave` existente já faz `update({ brand_logo_url: logoUrl, ... })`, então salvar com `null` persiste a remoção.
  - Opcional (recomendado): no `handleSave`, quando `logoUrl` ficar `null` e havia uma logo antes, também remover o arquivo do bucket `coach-branding` via `supabase.storage.from("coach-branding").remove([...])` para não deixar lixo. Listar `${user.id}/` e remover tudo é o mais simples e seguro.
- Quando não há logo, manter apenas **Enviar logo** como hoje.
- Texto de ajuda continua igual.

### 2. `src/lib/planilha-pdf-theme.ts` — corrigir sobreposição no header do PDF

Em `drawHeader()` (linhas ~285-297):

- Após desenhar a logo, **avançar `leftX`** para `margin + lw + 12` (gap de 12px), de modo que o nome do aluno, o subtítulo e a info line passem a ser desenhados à direita da logo, não por cima.
- Recalcular `nameMaxW` usando o novo `leftX` para que o texto seja truncado corretamente e nunca invada a área do FTP no canto direito.
- Manter a logo verticalmente alinhada com o bloco de texto (sem alterar `maxH = 36` nem a posição Y atual).

Resultado: logo à esquerda, bloco texto (nome do aluno + subtítulo + info) à direita da logo, FTP no canto direito — sem sobreposição.

## Fora de escopo

- Mudar tamanho máximo da logo (2MB), formatos aceitos ou layout geral da página Minha marca.
- Mudanças no header do PDF além da correção de posicionamento (cores, fontes, FTP, etc.).
- Outros PDFs além do header compartilhado em `planilha-pdf-theme.ts` (esse arquivo já é usado por 5/10/21/42km).
