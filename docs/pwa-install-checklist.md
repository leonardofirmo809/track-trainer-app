# PWA — Instalação do 8020Pace

**Domínio oficial:** https://app.8020pace.com.br  
**Fase:** App 1 — PWA instalável pelo navegador (sem Play Store / App Store)

---

## Instalar no Android (Chrome)

1. Abra `https://app.8020pace.com.br` no **Chrome para Android**.
2. Use o app por alguns segundos (navegue em pelo menos uma tela).
3. Toque nos **3 pontos** (⋮) no canto superior direito.
4. Toque em **"Adicionar à tela inicial"** ou **"Instalar app"**.
5. Confirme o nome **8020Pace** e toque em **Adicionar**.
6. O ícone aparece na tela inicial. Toque nele para abrir.

> O app abre em modo standalone — sem barra de endereços do navegador.

---

## Instalar no iPhone / iPad (Safari)

1. Abra `https://app.8020pace.com.br` no **Safari** (não funciona em Chrome iOS ou outros browsers iOS).
2. Toque no ícone de **compartilhar** (quadrado com seta para cima) na barra inferior.
3. Role a lista e toque em **"Adicionar à Tela de Início"**.
4. Confirme o nome **8020Pace** e toque em **Adicionar**.
5. O ícone aparece na tela inicial.

> No iOS, o app abre no Safari em modo standalone (sem barra de navegação do Safari).

---

## Instalar no Desktop (Chrome / Edge)

1. Acesse `https://app.8020pace.com.br` no Chrome ou Edge.
2. Procure o ícone **⊕** na barra de endereço (canto direito).
3. Clique em **"Instalar"** ou **"Instalar 8020Pace"**.
4. O app abre em janela própria, sem interface do navegador.

---

## O que validar após instalar

- [ ] Ícone "8020Pace" aparece na tela inicial com o logo correto
- [ ] App abre em modo standalone (sem barra de endereço)
- [ ] Login funciona normalmente
- [ ] Logout funciona e redireciona para tela de login
- [ ] Menu lateral (sidebar) abre e fecha corretamente
- [ ] Sidebar fecha automaticamente após tocar em um item de navegação
- [ ] Coach consegue acessar Dashboard, Alunos, Planilhas
- [ ] Runner consegue acessar Dashboard do Corredor e Planilha
- [ ] Admin consegue acessar área administrativa

---

## Problemas conhecidos

| Problema | Contexto | Status |
|---|---|---|
| Banner automático de instalação não aparece no Chrome Android | Chrome requer Service Worker com fetch handler para exibir o mini-infobar automaticamente. Sem SW, a instalação é feita manualmente pelo menu (3 pontos → Adicionar à tela inicial). | Documentado — instalação manual funciona |
| Chrome iOS não suporta PWA install | No iPhone/iPad, apenas o Safari permite adicionar à tela de início | Limitação do browser iOS — usar Safari |
| Modo offline mostra erro de rede | Sem Service Worker, o app não funciona offline. Isso é intencional nesta fase para evitar cache de dados autenticados. | Comportamento esperado |

---

## Decisões técnicas desta fase

### Service Worker: não implementado intencionalmente

**Motivo:** o app possui dados autenticados sensíveis (planos de treino, dados de atletas). Um Service Worker com cache agressivo poderia:
- Servir dados de uma sessão para outra sessão
- Exibir dados cacheados após logout
- Cachear tokens ou respostas autenticadas indevidamente

**Impacto:** a instalação via menu manual funciona normalmente em todos os navegadores. O banner automático do Chrome (mini-infobar) não aparece, mas a funcionalidade instalada é idêntica.

**Próxima fase (se aprovado):** implementar SW mínimo com `fetch` pass-through (sem cache) apenas para ativar o prompt automático no Chrome, se o benefício de UX justificar.

---

## Especificação técnica do PWA

| Item | Valor |
|---|---|
| `name` | `8020Pace — Treinos de Corrida` |
| `short_name` | `8020Pace` |
| `start_url` | `/` |
| `scope` | `/` |
| `display` | `standalone` |
| `theme_color` | `#1a274a` |
| `background_color` | `#fafafa` |
| `orientation` | `portrait-primary` |
| Ícone 192×192 | `/icon-192.png` |
| Ícone 512×512 (any + maskable) | `/icon-512.png` |
| Ícone SVG | `/icon.svg` |
| apple-touch-icon | `/icon-192.png` |
| Service Worker | Nenhum (intencional) |

---

*Fase App 1 — branch main — 2026-06-30*
