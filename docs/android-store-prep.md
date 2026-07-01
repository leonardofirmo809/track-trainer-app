# Android Play Store — Preparação

> **Status**: PWA pronto. Android ainda não implementado. Este documento registra as decisões tomadas e as pendências antes de gerar o app.

---

## Estratégia escolhida

**TWA (Trusted Web Activity) via Bubblewrap**

O 8020Pace é uma PWA em produção. A abordagem TWA cria um wrapper Android fino que abre a PWA no Chrome sem barra de navegador, desde que o `assetlinks.json` esteja configurado corretamente. Não requer reescrita de código.

- Domínio de produção: `https://app.8020pace.com.br`
- Package name escolhido: `br.com.corrida8020.app`

---

## Por que `br.com.8020pace.app` é inválido

Segmentos de package name Java/Android não podem começar com número. O segmento `8020pace` começa com `8`, tornando o nome inválido para geração de APK/AAB.

**Inválido:**
```
br.com.8020pace.app  ← segmento "8020pace" começa com número
```

**Válido (escolhido):**
```
br.com.corrida8020.app  ← todos os segmentos começam com letra
```

> ⚠️ O package name é **irreversível** após publicação. Escolha com cuidado.

---

## O que já está pronto (PWA)

| Item | Status |
|------|--------|
| Manifest (`/manifest.webmanifest`) | ✅ Completo |
| Ícone 192×192 PNG | ✅ |
| Ícone 512×512 PNG (any + maskable) | ✅ |
| Ícone 1024×1024 PNG (Play Store listing) | ✅ |
| Service Worker (`/sw.js`) | ✅ Mínimo e seguro |
| Offline fallback (`/offline.html`) | ✅ |
| HTTPS em produção | ✅ `app.8020pace.com.br` |
| `display: standalone` | ✅ |
| `theme_color: #1a274a` | ✅ |
| Página Política de Privacidade | ✅ `/politica-de-privacidade` |
| Página Termos de Uso | ✅ `/termos-de-uso` |
| Página Contato | ✅ `/contato` |
| Página Exclusão de Conta | ✅ `/exclusao-de-conta` |

---

## Pendências antes de gerar o app Android

### 1. Instalar ferramentas locais

```bash
# JDK 17 (Eclipse Temurin — gratuito)
# https://adoptium.net → Windows x64 Installer

# Android Studio (instala o SDK automaticamente)
# https://developer.android.com/studio

# Configurar variáveis de ambiente após instalação:
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.x.x
ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk

# Instalar Bubblewrap CLI
npm install -g @bubblewrap/cli
```

### 2. Gerar o projeto Android com Bubblewrap

```bash
bubblewrap init --manifest https://app.8020pace.com.br/manifest.webmanifest
# Responder ao wizard:
#   Package name: br.com.corrida8020.app
#   App name: 8020Pace
#   Start URL: https://app.8020pace.com.br/
#   Enable Play Billing: No
```

### 3. Gerar o keystore (ou usar Play App Signing)

> **Recomendado**: usar Play App Signing — Google guarda o certificado, eliminando risco de perder o keystore.

Se auto-assinar:
```bash
# Bubblewrap cria o keystore interativamente no passo `build`
bubblewrap build
```

### 4. Obter o SHA-256 fingerprint

**Com Play App Signing** (recomendado):
- Fazer upload do `.aab` como draft na Play Console
- Acessar: Lançamentos → Configuração → Assinatura de app
- Copiar o fingerprint SHA-256

**Com keystore próprio:**
```bash
keytool -list -v -keystore ./android.keystore -alias android
# Copiar a linha SHA256
```

### 5. Criar `public/.well-known/assetlinks.json`

> ⚠️ **NÃO criar este arquivo com fingerprint falso ou placeholder.**  
> Um fingerprint errado faz o Chrome exibir a barra de navegação permanentemente, quebrando a experiência TWA.

Criar apenas com o SHA-256 real obtido no passo anterior:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "br.com.corrida8020.app",
    "sha256_cert_fingerprints": ["AA:BB:CC:DD:..."]
  }
}]
```

O arquivo deve ser acessível em:
`https://app.8020pace.com.br/.well-known/assetlinks.json`

Para servir via Cloudflare Workers/TanStack Start, colocar em `public/.well-known/assetlinks.json`
(TanStack Start serve arquivos estáticos da pasta `public/` automaticamente).

### 6. Verificar Digital Asset Links

```bash
bubblewrap verify
# Ou usar a ferramenta Google:
# https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.8020pace.com.br&relation=delegate_permission/common.handle_all_urls
```

### 7. Gerar o AAB final

```bash
bubblewrap build
# Gera: android/app/build/outputs/bundle/release/app-release.aab
```

### 8. Criar conta Google Play Developer

- URL: https://play.google.com/console
- Taxa única: **USD 25**
- Aprovação: 1–2 dias úteis (Google exige verificação de identidade)

### 9. Configurar o listing na Play Store

Antes do upload do AAB, preparar:

- [ ] Ícone da loja: `public/icon-1024.png` (já existe)
- [ ] Capturas de tela: mínimo 2 para celular (1080×1920 ou similar)
- [ ] Descrição curta (máx. 80 chars)
- [ ] Descrição longa (máx. 4000 chars)
- [ ] URL da Política de Privacidade: `https://app.8020pace.com.br/politica-de-privacidade`
- [ ] Classificação indicativa (IARC — questionário no Console)

### 10. Data Safety (Google Play)

Preencher o questionário de Data Safety declarando:

| Dado | Coletado? | Compartilhado? | Finalidade |
|------|-----------|----------------|------------|
| E-mail | Sim | Não | Autenticação |
| Nome | Sim | Não | Identificação |
| Dados de saúde/fitness | Sim | Não | Prescrição de treinos |
| Dados do Strava (opcional) | Sim (se conectado) | Não | Sincronização de atividades |

### 11. Estratégia de release

1. Subir AAB como **Teste Interno** → testar em dispositivo físico
2. Validar: barra de URL ausente (TWA funcionando)
3. Validar: login, navegação, exportações funcionando
4. Promover para **Teste Fechado** → beta testers
5. Promover para **Produção**

---

## Riscos e atenção

| Risco | Nível | Detalhe |
|-------|-------|---------|
| Package name errado | 🔴 Alto | Irreversível após publicação. Usar `br.com.corrida8020.app` |
| assetlinks.json com fingerprint errado | 🔴 Alto | TWA mostra barra do Chrome — quebra experiência |
| Perda do keystore | 🔴 Alto | Usar Play App Signing para mitigar |
| Ícone maskable sem safe zone | 🟡 Médio | Conteúdo pode ser cortado em ícones circulares |
| Review Play Store (1–7 dias) | 🟡 Médio | Primeira publicação demora mais |
| Data Safety declaration incompleta | 🟡 Médio | Pode bloquear publicação |

---

## Próximo prompt sugerido

```
Vamos gerar o app Android via TWA/Bubblewrap para o 8020Pace.

Pré-condições confirmadas:
- JDK 17 instalado em: [CAMINHO]
- Android Studio instalado, SDK em: [CAMINHO]
- JAVA_HOME e ANDROID_HOME configurados
- Bubblewrap CLI instalado: npm install -g @bubblewrap/cli

Tarefas:
1. Rodar: bubblewrap init --manifest https://app.8020pace.com.br/manifest.webmanifest
   - Package name: br.com.corrida8020.app
2. Configurar Play App Signing
3. bubblewrap build → gerar .aab
4. Obter SHA-256 fingerprint do Play Console
5. Criar public/.well-known/assetlinks.json com fingerprint real
6. bubblewrap verify
7. Testar em dispositivo físico Android

Não subir para Play Store ainda. Apenas gerar e testar localmente.
```
