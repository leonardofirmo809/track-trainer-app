## Problema

Na tela **Minha marca**, o botão de remover a logo já existe no código, mas usa `variant="outline"` apenas com texto vermelho. Quando ele aparece ao lado do botão "Trocar logo" (também outline), ele se confunde visualmente e passa despercebido — por isso parece que não está lá.

Além disso, o bloco da logo está pequeno (avatar 96px + dois botões lado a lado), o que aperta os botões e pode esconder o "Remover" se a logo ainda não tiver carregado no estado local.

## O que vou mudar (somente UI em `src/routes/_authenticated/minha-marca.tsx`)

1. **Destacar o botão Remover**
   - Trocar de `variant="outline"` para `variant="destructive"` para ficar vermelho sólido e inconfundível.
   - Manter o ícone `Trash2` e o texto "Remover logo".

2. **Reorganizar os botões em coluna** quando há logo
   - Empilhar "Trocar logo" e "Remover logo" verticalmente (`flex-col`) com largura total, em vez de `flex-wrap` lado a lado. Isso garante que ambos apareçam mesmo em telas estreitas e cria hierarquia clara.

3. **Adicionar um rótulo visual no preview da logo**
   - Acima do avatar 96×96, mostrar um pequeno texto "Logo atual" quando `logoUrl` estiver presente, para deixar claro que há uma logo carregada e que o botão vermelho abaixo serve para removê-la.

4. **Garantir que o botão aparece logo após upload**
   - Já funciona via `setLogoUrl(url)` em `handleUpload`. Sem mudança de lógica.

## Fora de escopo

- Nada muda em PDF, storage, banco, ou na lógica de salvar.
- Cores da marca, preview do PDF e demais seções permanecem iguais.
